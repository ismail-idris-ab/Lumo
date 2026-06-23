import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  buildListingSlug,
  createListingSchema,
  listingQuerySchema,
  updateListingSchema,
  LISTING_TTL_DAYS,
  type ListingQuery,
  type Paginated,
  type PublicListing,
  type Role,
} from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { enqueueListingSync } from '../lib/queue';
import { getRedis } from '../lib/redis';
import { assertOwnership } from '../middleware/rbac';
import { notify } from '../lib/notify';
import { sendEmail } from '../lib/email';
import { formatKobo } from '../lib/format';

type Principal = { id: string; roles: Role[] };

const DAY_MS = 86_400_000;
function ttlExpiry(): Date {
  return new Date(Date.now() + LISTING_TTL_DAYS * DAY_MS);
}

// Includes for fully-hydrated public listing responses.
export const listingInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] as const },
  category: { select: { id: true, name: true, slug: true, attributeSchema: true } },
  owner: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      sellerProfile: { select: { verification: true, ratingAvg: true, ratingCount: true, avgReplyHours: true } },
    },
  },
} satisfies Prisma.ListingInclude;

export type HydratedListing = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

export function toPublicListing(l: HydratedListing, todayViews = 0): PublicListing {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    description: l.description,
    priceKobo: l.priceKobo,
    condition: l.condition,
    status: l.status,
    state: l.state,
    city: l.city,
    area: l.area,
    categoryId: l.categoryId,
    isPromoted: l.isPromoted,
    promotedUntil: l.promotedUntil?.toISOString() ?? null,
    expiresAt: l.expiresAt.toISOString(),
    viewsCount: l.viewsCount,
    todayViews,
    createdAt: l.createdAt.toISOString(),
    images: l.images.map((i) => ({
      id: i.id,
      url: i.url,
      publicId: i.publicId,
      isPrimary: i.isPrimary,
      order: i.order,
    })),
    category: {
      id: l.category.id,
      name: l.category.name,
      slug: l.category.slug,
      attributeSchema: l.category.attributeSchema as import('@lumo/shared').AttributeFieldDef[] | null,
    },
    seller: {
      id: l.owner.id,
      name: l.owner.name,
      avatarUrl: l.owner.avatarUrl,
      createdAt: l.owner.createdAt.toISOString(),
      verification: l.owner.sellerProfile?.verification ?? null,
      ratingAvg: l.owner.sellerProfile?.ratingAvg ?? null,
      ratingCount: l.owner.sellerProfile?.ratingCount ?? 0,
      avgReplyHours: l.owner.sellerProfile?.avgReplyHours ?? null,
    },
    promotionTier: (l.promotionTier ?? 'NONE') as import('@lumo/shared').PromotionTier,
    attributes: l.attributes as Record<string, unknown> | null,
    marketLowKobo: l.marketLowKobo,
    marketHighKobo: l.marketHighKobo,
  };
}

async function generateUniqueSlug(city: string, title: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = randomBytes(4).toString('hex').slice(0, 6);
    const slug = buildListingSlug(city, title, shortId);
    const existing = await prisma.listing.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  throw AppError.conflict('Could not generate a unique slug; try again');
}

export async function createListing(input: unknown, ownerId: string): Promise<PublicListing> {
  const data = createListingSchema.parse(input);

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw AppError.badRequest('Category not found');

  // Lazily become a seller on first post (single-account model, PRD §7).
  await prisma.sellerProfile.upsert({
    where: { userId: ownerId },
    create: { userId: ownerId },
    update: {},
  });
  await prisma.user.updateMany({
    where: { id: ownerId, NOT: { roles: { has: 'SELLER' } } },
    data: { roles: { push: 'SELLER' } },
  });

  const slug = await generateUniqueSlug(data.city, data.title);

  const listing = await prisma.listing.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      priceKobo: data.priceKobo,
      condition: data.condition,
      status: 'PENDING', // new listings are invisible until approved (domain rule 2)
      state: data.state,
      city: data.city,
      area: data.area ?? null,
      contactPhone: data.contactPhone ?? null,
      categoryId: data.categoryId,
      ownerId,
      expiresAt: ttlExpiry(),
      attributes: (data.attributes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
    include: listingInclude,
  });
  return toPublicListing(listing);
}

export async function listPublicListings(rawQuery: unknown): Promise<Paginated<PublicListing>> {
  const q: ListingQuery = listingQuerySchema.parse(rawQuery);

  const where: Prisma.ListingWhereInput = {
    status: 'APPROVED',
    deletedAt: null,
    expiresAt: { gt: new Date() },
    ...(q.categorySlug ? { category: { slug: q.categorySlug } } : {}),
    ...(q.state ? { state: { equals: q.state, mode: 'insensitive' } } : {}),
    ...(q.city ? { city: { equals: q.city, mode: 'insensitive' } } : {}),
    ...(q.area ? { area: { equals: q.area, mode: 'insensitive' } } : {}),
    ...(q.condition ? { condition: q.condition } : {}),
    ...(q.minPriceKobo !== undefined || q.maxPriceKobo !== undefined
      ? { priceKobo: { gte: q.minPriceKobo, lte: q.maxPriceKobo } }
      : {}),
    ...(q.q ? { title: { contains: q.q, mode: 'insensitive' } } : {}),
  };

  const sortField: Prisma.ListingOrderByWithRelationInput =
    q.sort === 'price_asc'
      ? { priceKobo: 'asc' }
      : q.sort === 'price_desc'
        ? { priceKobo: 'desc' }
        : { createdAt: 'desc' };
  // Promoted listings get a bounded lift (TRD §11) — real ranking lives in search (Phase 2).
  const orderBy: Prisma.ListingOrderByWithRelationInput[] = [{ isPromoted: 'desc' }, sortField];

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy,
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

export async function getListingBySlug(slug: string): Promise<PublicListing> {
  const listing = await prisma.listing.findUnique({ where: { slug }, include: listingInclude });
  if (!listing || listing.deletedAt) throw AppError.notFound('Listing not found');

  // Public visibility: only APPROVED + non-expired (PRD §11, APP_FLOW §7).
  if (listing.status !== 'APPROVED' || listing.expiresAt < new Date()) {
    throw AppError.notFound('Listing not available');
  }

  await prisma.listing.update({ where: { id: listing.id }, data: { viewsCount: { increment: 1 } } });

  let todayViews = 0;
  try {
    const redis = getRedis();
    const dateStr = new Date().toISOString().slice(0, 10);
    const key = `listing:views:daily:${listing.id}:${dateStr}`;
    todayViews = await redis.incr(key);
    if (todayViews === 1) await redis.expire(key, 172800); // 48h TTL
  } catch { /* fail-open — Redis unavailability never blocks a listing view */ }

  return toPublicListing({ ...listing, viewsCount: listing.viewsCount + 1 }, todayViews);
}

export async function listMyListings(ownerId: string): Promise<PublicListing[]> {
  const rows = await prisma.listing.findMany({
    where: { ownerId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: listingInclude,
  });
  return rows.map(toPublicListing);
}

// Same public-visibility predicate as listPublicListings/getListingBySlug — sitemap must only
// ever list what a visitor could actually open.
const SITEMAP_WHERE: Prisma.ListingWhereInput = {
  status: 'APPROVED',
  deletedAt: null,
  expiresAt: { gt: new Date() },
};

export async function countSitemapListings(): Promise<number> {
  return prisma.listing.count({ where: SITEMAP_WHERE });
}

export async function listSitemapListings(
  skip: number,
  take: number,
): Promise<{ slug: string; updatedAt: Date }[]> {
  return prisma.listing.findMany({
    where: SITEMAP_WHERE,
    select: { slug: true, updatedAt: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    skip,
    take,
  });
}

const EDITABLE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;

export async function updateListing(
  id: string,
  input: unknown,
  actor: Principal,
): Promise<PublicListing> {
  const data = updateListingSchema.parse(input);
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw AppError.notFound('Listing not found');
  assertOwnership(actor, existing.ownerId);

  if (!EDITABLE_STATUSES.includes(existing.status as (typeof EDITABLE_STATUSES)[number])) {
    throw AppError.conflict(`A ${existing.status} listing cannot be edited`);
  }

  if (data.categoryId && data.categoryId !== existing.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw AppError.badRequest('Category not found');
  }

  const hasChanges = Object.keys(data).length > 0;
  const { attributes, ...scalarData } = data;
  const listing = await prisma.listing.update({
    where: { id },
    data: {
      ...scalarData,
      // Explicitly handle nullable JSON — Prisma requires Prisma.JsonNull not null.
      ...(attributes !== undefined ? { attributes: (attributes as Prisma.InputJsonValue) ?? Prisma.JsonNull } : {}),
      // Material edits re-enter moderation (domain rule 2). Slug stays stable (SEO).
      ...(hasChanges ? { status: 'PENDING' } : {}),
    },
    include: listingInclude,
  });
  // Edit re-pends (or no-op) → drop from search until re-approved.
  if (hasChanges) await enqueueListingSync(id);

  // Notify price watchers when price drops.
  if (data.priceKobo !== undefined && data.priceKobo < existing.priceKobo) {
    void notifyPriceWatchers(id, listing.title, listing.slug, existing.priceKobo, data.priceKobo);
  }

  return toPublicListing(listing);
}

export async function deleteListing(id: string, actor: Principal): Promise<void> {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw AppError.notFound('Listing not found');
  assertOwnership(actor, existing.ownerId);

  await prisma.listing.update({
    where: { id },
    data: { status: 'DELETED', deletedAt: new Date() },
  });
  await enqueueListingSync(id);
}

// Reveal seller phone — login-gated + rate-limited (domain rule 8). Only for visible listings.
export async function revealContact(
  listingId: string,
  userId: string,
): Promise<{ sellerId: string; sellerName: string; phone: string | null }> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      status: true,
      deletedAt: true,
      expiresAt: true,
      contactPhone: true,
      owner: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!listing || listing.deletedAt || listing.status !== 'APPROVED' || listing.expiresAt < new Date()) {
    throw AppError.notFound('Listing not available');
  }
  // Record the reveal as a unique lead (idempotent per buyer+listing). Never block the reveal on this.
  if (listing.owner.id !== userId) {
    await prisma.contactReveal
      .upsert({ where: { userId_listingId: { userId, listingId } }, create: { userId, listingId }, update: {} })
      .catch(() => undefined);
  }
  return { sellerId: listing.owner.id, sellerName: listing.owner.name, phone: listing.contactPhone ?? listing.owner.phone };
}

async function notifyPriceWatchers(
  listingId: string,
  title: string,
  slug: string,
  oldPriceKobo: number,
  newPriceKobo: number,
): Promise<void> {
  const watchers = await prisma.priceWatch.findMany({
    where: { listingId },
    include: { user: { select: { email: true } } },
  });
  if (watchers.length === 0) return;

  type WatcherWithUser = (typeof watchers)[0];
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
  await Promise.allSettled(
    watchers.map(async (w: WatcherWithUser) => {
      await notify(w.userId, 'PRICE_DROP', {
        listingId,
        listingSlug: slug,
        listingTitle: title,
        oldPriceKobo,
        newPriceKobo,
      });
      void sendEmail(
        w.user.email,
        `Price dropped: ${title}`,
        `<p>A listing you're watching just dropped in price:</p>
         <p><strong>${title}</strong><br>
         Was: <del>${formatKobo(oldPriceKobo)}</del> → Now: <strong>${formatKobo(newPriceKobo)}</strong></p>
         <p><a href="${webUrl}/listing/${slug}">View listing</a></p>`,
      );
    }),
  );

  // Update stored price so next drop is relative to latest.
  await prisma.priceWatch.updateMany({
    where: { listingId },
    data: { priceKobo: newPriceKobo },
  });
}

export async function markListingSold(id: string, actor: Principal): Promise<PublicListing> {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw AppError.notFound('Listing not found');
  assertOwnership(actor, existing.ownerId);
  if (!['APPROVED', 'PENDING'].includes(existing.status)) {
    throw AppError.conflict(`A ${existing.status} listing cannot be marked sold`);
  }
  const listing = await prisma.listing.update({
    where: { id },
    data: { status: 'SOLD' },
    include: listingInclude,
  });
  await enqueueListingSync(id);
  return toPublicListing(listing);
}
