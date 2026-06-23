import type { Listing, Prisma } from '@prisma/client';
import {
  adminListingQuerySchema,
  moderationReasonSchema,
  requestChangesSchema,
  LISTING_TTL_DAYS,
  type Paginated,
  type PublicListing,
} from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { writeAudit, type Actor } from '../lib/audit';
import { notify } from '../lib/notify';
import { emailUser } from '../lib/email';
import { enqueueListingSync, enqueueCheckSavedSearches } from '../lib/queue';
import { listingInclude, toPublicListing } from './listing.service';

const DAY_MS = 86_400_000;

export async function listListingsForAdmin(rawQuery: unknown): Promise<Paginated<PublicListing>> {
  const q = adminListingQuerySchema.parse(rawQuery);
  const where: Prisma.ListingWhereInput = {
    deletedAt: null,
    ...(q.status ? { status: q.status } : {}),
    ...(q.categorySlug ? { category: { slug: q.categorySlug } } : {}),
    ...(q.q
      ? {
          OR: [
            { title: { contains: q.q, mode: 'insensitive' } },
            { description: { contains: q.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      // PENDING first (queue priority), then newest.
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: listingInclude,
    }),
  ]);

  return {
    items: rows.map(toPublicListing),
    page: q.page,
    limit: q.limit,
    total,
    totalPages: Math.ceil(total / q.limit),
  };
}

async function loadListing(id: string): Promise<Listing> {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.deletedAt) throw AppError.notFound('Listing not found');
  return listing;
}

async function applyModeration(
  id: string,
  action: string,
  data: Prisma.ListingUpdateInput,
  actor: Actor,
  auditExtra: Record<string, unknown> = {},
): Promise<PublicListing> {
  const before = await loadListing(id);
  const listing = await prisma.listing.update({ where: { id }, data, include: listingInclude });
  await writeAudit({
    actorId: actor.id,
    action,
    targetType: 'Listing',
    targetId: id,
    before: { status: before.status },
    after: { status: listing.status, ...auditExtra },
    ip: actor.ip,
  });
  await enqueueListingSync(id); // worker upserts (if APPROVED) or removes
  return toPublicListing(listing);
}

export async function approveListing(id: string, actor: Actor): Promise<PublicListing> {
  const listing = await applyModeration(
    id,
    'listing.approve',
    { status: 'APPROVED', expiresAt: new Date(Date.now() + LISTING_TTL_DAYS * DAY_MS) },
    actor,
  );
  await notify(listing.seller!.id, 'listing.approved', { listingId: id, slug: listing.slug });
  void emailUser(
    listing.seller!.id,
    'Your Lumo listing is now live',
    `<p>Good news — “${listing.title}” has been approved and is now visible on Lumo.</p>`,
  );
  void enqueueCheckSavedSearches(id);
  return listing;
}

export async function rejectListing(id: string, input: unknown, actor: Actor): Promise<PublicListing> {
  const { reason } = moderationReasonSchema.parse(input);
  const listing = await applyModeration(id, 'listing.reject', { status: 'REJECTED' }, actor, { reason });
  await notify(listing.seller!.id, 'listing.rejected', { listingId: id, reason });
  void emailUser(
    listing.seller!.id,
    'Your Lumo listing needs changes',
    `<p>“${listing.title}” was not approved.</p><p>Reason: ${reason}</p>`,
  );
  return listing;
}

export async function suspendListing(id: string, input: unknown, actor: Actor): Promise<PublicListing> {
  const { reason } = moderationReasonSchema.parse(input);
  const listing = await applyModeration(id, 'listing.suspend', { status: 'SUSPENDED' }, actor, { reason });
  await notify(listing.seller!.id, 'listing.suspended', { listingId: id, reason });
  return listing;
}

// Request changes: stays PENDING (no dedicated status enum); seller is notified and re-submits.
export async function requestChanges(id: string, input: unknown, actor: Actor): Promise<PublicListing> {
  const { note } = requestChangesSchema.parse(input);
  const listing = await applyModeration(id, 'listing.request_changes', { status: 'PENDING' }, actor, { note });
  await notify(listing.seller!.id, 'listing.changes_requested', { listingId: id, note });
  return listing;
}

// Flag for priority review — creates a MANUAL_FLAG review (post-publish, listing stays live)
// plus the audit trail entry.
export async function flagListing(id: string, actor: Actor): Promise<PublicListing> {
  const before = await loadListing(id);
  await prisma.moderationReview.create({
    data: { listingId: id, sellerId: before.ownerId, reason: 'MANUAL_FLAG', state: 'OPEN' },
  });
  await writeAudit({
    actorId: actor.id,
    action: 'listing.flag',
    targetType: 'Listing',
    targetId: id,
    before: { status: before.status },
    after: { status: before.status, flagged: true },
    ip: actor.ip,
  });
  const listing = await prisma.listing.findUnique({ where: { id }, include: listingInclude });
  return toPublicListing(listing!);
}

// Post-publish review queue: PENDING listings (pre-publish, blocks liquidity) always sort
// above OPEN reviews (post-publish, doesn't block anything) — a solo admin works top-down.
export interface ReviewQueueItem {
  kind: 'PENDING' | 'REVIEW';
  listing: PublicListing;
  review?: { id: string; reason: string; createdAt: string };
}
export async function listReviewQueue(): Promise<ReviewQueueItem[]> {
  const [pending, openReviews] = await Promise.all([
    prisma.listing.findMany({
      where: { status: 'PENDING', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: listingInclude,
    }),
    prisma.moderationReview.findMany({
      where: { state: 'OPEN' },
      orderBy: { createdAt: 'asc' },
      include: { listing: { include: listingInclude } },
    }),
  ]);
  return [
    ...pending.map((l) => ({ kind: 'PENDING' as const, listing: toPublicListing(l) })),
    ...openReviews.map((r) => ({
      kind: 'REVIEW' as const,
      listing: toPublicListing(r.listing),
      review: { id: r.id, reason: r.reason, createdAt: r.createdAt.toISOString() },
    })),
  ];
}

export async function clearReview(id: string, actor: Actor): Promise<void> {
  await prisma.moderationReview.update({
    where: { id },
    data: { state: 'CLEARED', reviewedAt: new Date(), reviewedBy: actor.id },
  });
}

// Routes through the EXISTING rejectListing/suspendListing — that's the feedback loop into the
// trust gate (resolveInitialStatus's clean-record check already reads REJECTED/SUSPENDED
// listings), no new trust logic needed here.
export async function actionReview(
  id: string,
  action: 'reject' | 'suspend',
  input: unknown,
  actor: Actor,
): Promise<PublicListing> {
  const review = await prisma.moderationReview.findUnique({ where: { id } });
  if (!review) throw AppError.notFound('Review not found');

  const listing =
    action === 'reject'
      ? await rejectListing(review.listingId, input, actor)
      : await suspendListing(review.listingId, input, actor);

  await prisma.moderationReview.update({
    where: { id },
    data: { state: 'ACTIONED', reviewedAt: new Date(), reviewedBy: actor.id, outcome: action },
  });
  return listing;
}

export async function adminDeleteListing(id: string, actor: Actor): Promise<void> {
  const before = await loadListing(id);
  await prisma.listing.update({ where: { id }, data: { status: 'DELETED', deletedAt: new Date() } });
  await writeAudit({
    actorId: actor.id,
    action: 'listing.admin_delete',
    targetType: 'Listing',
    targetId: id,
    before: { status: before.status },
    after: { status: 'DELETED' },
    ip: actor.ip,
  });
  await enqueueListingSync(id);
  await notify(before.ownerId, 'listing.deleted_by_admin', { listingId: id });
}
