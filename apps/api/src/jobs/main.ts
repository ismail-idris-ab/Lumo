import { Queue, Worker } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { runExpirySweep } from '../services/expiry.service';
import { EXPIRY_SWEEP_INTERVAL_MS, JOB_NAMES, QUEUE_NAMES } from './queues';

// Worker process entrypoint: `pnpm --filter @lumo/api worker`.
// Deployed separately from the API (TRD §25).
async function main() {
  const connection = createRedisConnection();
  const queue = new Queue(QUEUE_NAMES.maintenance, { connection });

  // Repeatable expiry sweep (idempotent → upsert is safe on every boot).
  await queue.upsertJobScheduler(
    JOB_NAMES.expirySweep,
    { every: EXPIRY_SWEEP_INTERVAL_MS },
    { name: JOB_NAMES.expirySweep },
  );

  const worker = new Worker(
    QUEUE_NAMES.maintenance,
    async (job) => {
      if (job.name === JOB_NAMES.expirySweep) return runExpirySweep();
      logger.warn({ job: job.name }, 'Unknown job');
    },
    { connection },
  );

  worker.on('completed', (job) => logger.info({ job: job.name, result: job.returnvalue }, 'Job completed'));
  worker.on('failed', (job, err) => logger.error({ job: job?.name, err }, 'Job failed'));

  logger.info('🛠️  Maintenance worker started');

  async function shutdown(signal: string) {
    logger.info(`${signal} received — stopping worker`);
    await worker.close();
    await queue.close();
    connection.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error(err, 'Worker failed to start');
  process.exit(1);
});
