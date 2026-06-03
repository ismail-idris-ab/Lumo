import { prisma } from '../lib/prisma';
import { notify } from '../lib/notify';
import { logger } from '../lib/logger';
import { enqueueListingSync } from '../lib/queue';

export interface ExpirySweepResult {
  listingsExpired: number;
  promotionsReverted: number;
  featuredReverted: number;
  subscriptionsDeactivated: number;
}

// Idempotent maintenance sweep (TRD §15, APP_FLOW §20). Safe to run repeatedly.
export async function runExpirySweep(): Promise<ExpirySweepResult> {
  const now = new Date();

  // 1. APPROVED listings past TTL → EXPIRED (+ notify seller with renew CTA).
  const expiring = await prisma.listing.findMany({
    where: { status: 'APPROVED', expiresAt: { lt: now }, deletedAt: null },
    select: { id: true, ownerId: true, slug: true },
  });
  if (expiring.length > 0) {
    await prisma.listing.updateMany({
      where: { id: { in: expiring.map((l) => l.id) } },
      data: { status: 'EXPIRED' },
    });
    await Promise.all(
      expiring.flatMap((l) => [
        notify(l.ownerId, 'listing.expired', { listingId: l.id, slug: l.slug }),
        enqueueListingSync(l.id), // drop from search
      ]),
    );
  }

  // 2. Expired promotions → drop boost (re-sync to refresh the index doc).
  const promoStale = await prisma.listing.findMany({
    where: { isPromoted: true, promotedUntil: { lt: now } },
    select: { id: true },
  });
  const promo = await prisma.listing.updateMany({
    where: { isPromoted: true, promotedUntil: { lt: now } },
    data: { isPromoted: false },
  });
  await Promise.all(promoStale.map((l) => enqueueListingSync(l.id)));

  // 3. Expired featured sellers.
  const featured = await prisma.sellerProfile.updateMany({
    where: { isFeatured: true, featuredUntil: { lt: now } },
    data: { isFeatured: false },
  });

  // 4. Expired subscriptions → deactivate (Phase 5 applies free limits).
  const subs = await prisma.sellerSubscription.updateMany({
    where: { active: true, expiresAt: { lt: now } },
    data: { active: false },
  });

  const result: ExpirySweepResult = {
    listingsExpired: expiring.length,
    promotionsReverted: promo.count,
    featuredReverted: featured.count,
    subscriptionsDeactivated: subs.count,
  };
  logger.info(result, 'Expiry sweep complete');
  return result;
}
