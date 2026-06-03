export const QUEUE_NAMES = {
  maintenance: 'maintenance',
  search: 'search',
} as const;

export const JOB_NAMES = {
  expirySweep: 'expiry-sweep',
  syncListing: 'sync-listing',
  reindexAll: 'reindex-all',
} as const;

// How often the expiry sweep runs (TRD §15: ~every 10 min).
export const EXPIRY_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// Nightly full search reconcile (TRD §11 — guards against index drift).
export const REINDEX_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface SyncListingJob {
  listingId: string;
}
