import { describe, it, expect, vi, beforeEach } from 'vitest';

// Idempotent maintenance sweep (apps/api/src/services/expiry.service.ts). This file only
// covers the spot-check queue-hygiene step (step 6) — the other 5 steps (expiry, promo/featured/
// subscription revert, freshness nudge) are pre-existing and untested here; all are stubbed to
// no-ops so the sweep runs DB-free without exercising unrelated branches.

const { listing, sellerProfile, sellerSubscription, moderationReview, notify, emailUser, enqueueListingSync } =
  vi.hoisted(() => ({
    listing: { findMany: vi.fn(), updateMany: vi.fn() },
    sellerProfile: { updateMany: vi.fn() },
    sellerSubscription: { updateMany: vi.fn() },
    moderationReview: { updateMany: vi.fn() },
    notify: vi.fn(),
    emailUser: vi.fn(),
    enqueueListingSync: vi.fn(),
  }));

vi.mock('../lib/prisma', () => ({ prisma: { listing, sellerProfile, sellerSubscription, moderationReview } }));
vi.mock('../lib/notify', () => ({ notify }));
vi.mock('../lib/email', () => ({ emailUser }));
vi.mock('../lib/queue', () => ({ enqueueListingSync }));
vi.mock('../lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { runExpirySweep } from './expiry.service';

beforeEach(() => {
  vi.clearAllMocks();
  listing.findMany.mockResolvedValue([]); // expiring / promoStale / toNudge — all empty
  listing.updateMany.mockResolvedValue({ count: 0 });
  sellerProfile.updateMany.mockResolvedValue({ count: 0 });
  sellerSubscription.updateMany.mockResolvedValue({ count: 0 });
  moderationReview.updateMany.mockResolvedValue({ count: 0 });
});

describe('runExpirySweep — spot-check queue hygiene', () => {
  it('auto-clears stale OPEN SPOT_CHECK reviews, never REPORTED', async () => {
    moderationReview.updateMany.mockResolvedValue({ count: 2 });

    const result = await runExpirySweep();

    expect(moderationReview.updateMany).toHaveBeenCalledWith({
      where: { state: 'OPEN', reason: 'SPOT_CHECK', createdAt: { lt: expect.any(Date) } },
      data: expect.objectContaining({ state: 'CLEARED', outcome: 'auto-cleared: SLA' }),
    });
    expect(result.spotChecksAutoCleared).toBe(2);
  });

  it('reports zero when nothing is stale', async () => {
    const result = await runExpirySweep();
    expect(result.spotChecksAutoCleared).toBe(0);
  });
});
