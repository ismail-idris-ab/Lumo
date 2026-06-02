export const QUEUE_NAMES = {
  maintenance: 'maintenance',
} as const;

export const JOB_NAMES = {
  expirySweep: 'expiry-sweep',
} as const;

// How often the expiry sweep runs (TRD §15: ~every 10 min).
export const EXPIRY_SWEEP_INTERVAL_MS = 10 * 60 * 1000;
