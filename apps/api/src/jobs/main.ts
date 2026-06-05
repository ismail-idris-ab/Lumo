import '../instrument'; // Sentry — load before anything else.
import { Queue, Worker } from 'bullmq';
import { Sentry } from '../instrument';
import { createRedisConnection } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { isSearchConfigured } from '../lib/search';
import { runExpirySweep } from '../services/expiry.service';
import { reconcilePendingPayments } from '../services/payment.service';
import { reindexAllApproved, syncListingDoc } from '../services/search-sync';
import {
  EXPIRY_SWEEP_INTERVAL_MS,
  JOB_NAMES,
  QUEUE_NAMES,
  RECONCILE_INTERVAL_MS,
  REINDEX_INTERVAL_MS,
  type SyncListingJob,
} from './queues';

// Worker process entrypoint: `pnpm --filter @lumo/api worker`.
// Deployed separately from the API (TRD §25).
async function main() {
  const connection = createRedisConnection();
  const closers: Array<() => Promise<void>> = [];

  // ── Maintenance queue: repeatable expiry sweep ──
  const maintenance = new Queue(QUEUE_NAMES.maintenance, { connection });
  await maintenance.upsertJobScheduler(
    JOB_NAMES.expirySweep,
    { every: EXPIRY_SWEEP_INTERVAL_MS },
    { name: JOB_NAMES.expirySweep },
  );
  await maintenance.upsertJobScheduler(
    JOB_NAMES.reconcilePayments,
    { every: RECONCILE_INTERVAL_MS },
    { name: JOB_NAMES.reconcilePayments },
  );
  const maintenanceWorker = new Worker(
    QUEUE_NAMES.maintenance,
    async (job) => {
      if (job.name === JOB_NAMES.expirySweep) return runExpirySweep();
      if (job.name === JOB_NAMES.reconcilePayments) return reconcilePendingPayments();
      logger.warn({ job: job.name }, 'Unknown maintenance job');
    },
    { connection },
  );
  maintenanceWorker.on('failed', (job, err) =>
    Sentry.captureException(err, { tags: { queue: QUEUE_NAMES.maintenance, job: job?.name } }),
  );
  closers.push(() => maintenanceWorker.close(), () => maintenance.close());

  // ── Search queue: per-listing sync + nightly reconcile (only if search configured) ──
  if (isSearchConfigured) {
    const search = new Queue(QUEUE_NAMES.search, { connection });
    await search.upsertJobScheduler(
      JOB_NAMES.reindexAll,
      { every: REINDEX_INTERVAL_MS },
      { name: JOB_NAMES.reindexAll },
    );
    const searchWorker = new Worker(
      QUEUE_NAMES.search,
      async (job) => {
        if (job.name === JOB_NAMES.syncListing) {
          await syncListingDoc((job.data as SyncListingJob).listingId);
          return;
        }
        if (job.name === JOB_NAMES.reindexAll) return reindexAllApproved();
        logger.warn({ job: job.name }, 'Unknown search job');
      },
      { connection },
    );
    searchWorker.on('failed', (job, err) =>
      Sentry.captureException(err, { tags: { queue: QUEUE_NAMES.search, job: job?.name } }),
    );
    closers.push(() => searchWorker.close(), () => search.close());
    logger.info('🔎 Search worker started');
  } else {
    logger.warn('Search not configured — search worker disabled');
  }

  logger.info('🛠️  Maintenance worker started');

  async function shutdown(signal: string) {
    logger.info(`${signal} received — stopping workers`);
    for (const close of closers) await close();
    connection.disconnect();
    await prisma.$disconnect();
    await Sentry.flush(2000); // drain buffered events before exit
    process.exit(0);
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error(err, 'Worker failed to start');
  Sentry.captureException(err);
  void Sentry.flush(2000).finally(() => process.exit(1));
});
