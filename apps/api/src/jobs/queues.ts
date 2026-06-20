export const QUEUE_NAMES = {
  maintenance: 'maintenance',
  search: 'search',
} as const;

export const JOB_NAMES = {
  expirySweep: 'expiry-sweep',
  reconcilePayments: 'reconcile-payments',
  syncListing: 'sync-listing',
  reindexAll: 'reindex-all',
  computeMarketPrice: 'compute-market-price',
  checkSavedSearches: 'check-saved-searches',
} as const;

// How often the expiry sweep runs (TRD §15: ~every 10 min).
export const EXPIRY_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// Nightly full search reconcile (TRD §11 — guards against index drift).
export const REINDEX_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Re-verify stale PENDING payments to catch missed webhooks (TRD §14).
export const RECONCILE_INTERVAL_MS = 15 * 60 * 1000;
export const PAYMENT_STALE_MS = 10 * 60 * 1000;

// Compute market price percentiles (p25/p75) per category+condition (every 6 hours).
export const MARKET_PRICE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface SyncListingJob {
  listingId: string;
}

export interface CheckSavedSearchesJob {
  listingId: string;
}
