import { SPOTCHECK_AUTOCLEAR_DAYS } from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { notify } from '../lib/notify';
import { emailUser } from '../lib/email';
import { logger } from '../lib/logger';
import { enqueueListingSync } from '../lib/queue';

const DAY_MS = 86_400_000;
const NUDGE_AFTER_DAYS = 20;
const NUDGE_COOLDOWN_DAYS = 7;

export interface ExpirySweepResult {
  listingsExpired: number;
  promotionsReverted: number;
  featuredReverted: number;
  subscriptionsDeactivated: number;
  freshnessNudgesSent: number;
  spotChecksAutoCleared: number;
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

  // 5. Freshness nudge: sellers whose APPROVED listings are 20+ days old,
  //    not nudged in the last 7 days. Prompts them to mark as sold if it's gone.
  const nudgeCutoff = new Date(now.getTime() - NUDGE_AFTER_DAYS * DAY_MS);
  const cooldownCutoff = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * DAY_MS);

  const toNudge = await prisma.listing.findMany({
    where: {
      status: 'APPROVED',
      deletedAt: null,
      createdAt: { lt: nudgeCutoff },
      OR: [
        { lastFreshnessNudgeAt: null },
        { lastFreshnessNudgeAt: { lt: cooldownCutoff } },
      ],
    },
    select: { id: true, title: true, slug: true, ownerId: true },
  });

  if (toNudge.length > 0) {
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
    await Promise.all(
      toNudge.map(async (l) => {
        await notify(l.ownerId, 'listing.freshness_nudge', {
          listingId: l.id,
          slug: l.slug,
          title: l.title,
        });
        void emailUser(
          l.ownerId,
          `Is your listing still available? — ${l.title}`,
          `<p>Your listing <strong>"${l.title}"</strong> has been up for ${NUDGE_AFTER_DAYS}+ days.</p>
           <p>If it's sold, please mark it — buyers are still seeing it.</p>
           <p><a href="${webUrl}/dashboard/listings">Manage your listings →</a></p>`,
        );
      }),
    );
    await prisma.listing.updateMany({
      where: { id: { in: toNudge.map((l) => l.id) } },
      data: { lastFreshnessNudgeAt: now },
    });
  }

  // 6. Queue hygiene: an unread SPOT_CHECK review past its SLA auto-clears — never REPORTED.
  const autoclearCutoff = new Date(now.getTime() - SPOTCHECK_AUTOCLEAR_DAYS * DAY_MS);
  const autoCleared = await prisma.moderationReview.updateMany({
    where: { state: 'OPEN', reason: 'SPOT_CHECK', createdAt: { lt: autoclearCutoff } },
    data: { state: 'CLEARED', reviewedAt: now, outcome: 'auto-cleared: SLA' },
  });

  const result: ExpirySweepResult = {
    listingsExpired: expiring.length,
    promotionsReverted: promo.count,
    featuredReverted: featured.count,
    subscriptionsDeactivated: subs.count,
    freshnessNudgesSent: toNudge.length,
    spotChecksAutoCleared: autoCleared.count,
  };
  logger.info(result, 'Expiry sweep complete');
  return result;
}
