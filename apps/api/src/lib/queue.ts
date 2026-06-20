import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';
import { isSearchConfigured } from './search';
import { logger } from './logger';
import { JOB_NAMES, QUEUE_NAMES, type SyncListingJob, type CheckSavedSearchesJob } from '../jobs/queues';

// Producer-side queue (API process). Workers consume in jobs/main.ts.
let searchQueue: Queue | null = null;
function getSearchQueue(): Queue | null {
  if (!isSearchConfigured) return null;
  searchQueue ??= new Queue(QUEUE_NAMES.search, { connection: createRedisConnection() });
  return searchQueue;
}

let maintenanceQueue: Queue | null = null;
function getMaintenanceQueue(): Queue {
  maintenanceQueue ??= new Queue(QUEUE_NAMES.maintenance, { connection: createRedisConnection() });
  return maintenanceQueue;
}

export async function enqueueCheckSavedSearches(listingId: string): Promise<void> {
  try {
    await getMaintenanceQueue().add(
      JOB_NAMES.checkSavedSearches,
      { listingId } satisfies CheckSavedSearchesJob,
      { removeOnComplete: true, removeOnFail: 50, attempts: 2 },
    );
  } catch (err) {
    logger.error({ err, listingId }, 'Failed to enqueue check-saved-searches');
  }
}

// Fire-and-forget search sync (outbox). Best-effort: never break the request —
// Postgres is the source of truth and the nightly reconcile catches drift.
export async function enqueueListingSync(listingId: string): Promise<void> {
  const queue = getSearchQueue();
  if (!queue) return;
  try {
    await queue.add(
      JOB_NAMES.syncListing,
      { listingId } satisfies SyncListingJob,
      {
        jobId: `sync-${listingId}`, // de-dupe rapid successive edits
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  } catch (err) {
    logger.error({ err, listingId }, 'Failed to enqueue search sync');
  }
}
