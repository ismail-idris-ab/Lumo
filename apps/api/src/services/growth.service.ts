import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { writeAudit, type Actor } from '../lib/audit';
import { notify } from '../lib/notify';
import { emailUser } from '../lib/email';
import { syncListingDoc } from './search-sync';

const DAY_MS = 86_400_000;
const addDays = (days: number) => new Date(Date.now() + days * DAY_MS);

const GRANT_ACTION = 'early_adopter.grant';

export interface EarlyAdopterGrantResult {
  usersConsidered: number;
  promoted: { userId: string; listingId: string }[];
  verified: { userId: string }[];
  skipped: { userId: string; reason: string }[];
}

// One-off growth campaign: free promo + free verification for the earliest N signups.
// Idempotent — re-running skips users already granted (tracked via AuditLog action) so
// it's safe to retry with a higher count without double-promoting earlier users.
export async function grantEarlyAdopterBenefits(
  count: number,
  promoDays: number,
  promotionTier: 'BOOST' | 'TOP' | 'DIAMOND' | 'ENTERPRISE',
  actor: Actor,
): Promise<EarlyAdopterGrantResult> {
  if (count < 1 || count > 500) throw AppError.badRequest('count must be between 1 and 500');
  if (promoDays < 1 || promoDays > 90) throw AppError.badRequest('promoDays must be between 1 and 90');

  const users = await prisma.user.findMany({
    where: { deletedAt: null, listings: { some: {} } },
    orderBy: { createdAt: 'asc' },
    take: count,
    select: { id: true },
  });

  const already = await prisma.auditLog.findMany({
    where: { action: GRANT_ACTION, targetType: 'User', targetId: { in: users.map((u) => u.id) } },
    select: { targetId: true },
  });
  const alreadyGranted = new Set(already.map((a) => a.targetId));

  const result: EarlyAdopterGrantResult = {
    usersConsidered: users.length,
    promoted: [],
    verified: [],
    skipped: [],
  };

  for (const { id: userId } of users) {
    if (alreadyGranted.has(userId)) {
      result.skipped.push({ userId, reason: 'already granted' });
      continue;
    }

    const listing = await prisma.listing.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (listing) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { isPromoted: true, promotedUntil: addDays(promoDays), promotionTier },
      });
      await syncListingDoc(listing.id);
      result.promoted.push({ userId, listingId: listing.id });
    }

    const verificationRequest = await prisma.verificationRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (verificationRequest && verificationRequest.status !== 'VERIFIED') {
      await prisma.$transaction([
        prisma.verificationRequest.update({
          where: { id: verificationRequest.id },
          data: { status: 'VERIFIED', feePaid: true, reviewerId: actor.id, reviewedAt: new Date() },
        }),
        prisma.sellerProfile.upsert({
          where: { userId },
          create: { userId, verification: 'VERIFIED', verifiedAt: new Date() },
          update: { verification: 'VERIFIED', verifiedAt: new Date() },
        }),
      ]);
      result.verified.push({ userId });
    } else if (!verificationRequest) {
      // No submission on file — grant the badge directly rather than fabricating docs.
      await prisma.sellerProfile.upsert({
        where: { userId },
        create: { userId, verification: 'VERIFIED', verifiedAt: new Date() },
        update: { verification: 'VERIFIED', verifiedAt: new Date() },
      });
      result.verified.push({ userId });
    }

    await writeAudit({
      actorId: actor.id,
      action: GRANT_ACTION,
      targetType: 'User',
      targetId: userId,
      after: { promoDays, promotionTier, listingId: listing?.id ?? null },
      ip: actor.ip,
    });
    await notify(userId, 'early_adopter.granted', { promoDays, promotionTier });
    void emailUser(
      userId,
      'You’re an early Lumo seller 🎉',
      `<p>Thanks for being one of our first sellers — we've promoted your listing for ${promoDays} days and verified your account, on us.</p>`,
    );
  }

  return result;
}
