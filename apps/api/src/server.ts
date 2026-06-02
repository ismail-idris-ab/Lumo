import { createApp } from './app';
import { config } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info(`🚀 API listening on ${config.API_BASE_URL} (${config.NODE_ENV})`);
});

// Graceful shutdown.
async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  // Force-exit if close hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
