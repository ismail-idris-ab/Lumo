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
import { assertOwnership } from '../middleware/rbac';

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
      sellerProfile: { select: { verification: true, ratingAvg: true, ratingCount: true } },
    },
  },
} satisfies Prisma.ListingInclude;

export type HydratedListing = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

export function toPublicListing(l: HydratedListing): PublicListing {
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
      attributeSchema: l.category.attributeSchema,
    },
    seller: {
      id: l.owner.id,
      name: l.owner.name,
      avatarUrl: l.owner.avatarUrl,
      createdAt: l.owner.createdAt.toISOString(),
      verification: l.owner.sellerProfile?.verification ?? null,
      ratingAvg: l.owner.sellerProfile?.ratingAvg ?? null,
      ratingCount: l.owner.sellerProfile?.ratingCount ?? 0,
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
  return toPublicListing({ ...listing, viewsCount: listing.viewsCount + 1 });
}

export async function listMyListings(ownerId: string): Promise<PublicListing[]> {
  const rows = await prisma.listing.findMany({
    where: { ownerId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: listingInclude,
  });
  return rows.map(toPublicListing);
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
  return { sellerId: listing.owner.id, sellerName: listing.owner.name, phone: listing.owner.phone };
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
