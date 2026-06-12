import {
  listingQuerySchema,
  type ListingQuery,
  type Paginated,
  type PublicListing,
  type SearchListing,
} from '@lumo/shared';
import { logger } from '../lib/logger';
import { getListingsIndex, isSearchConfigured, type ListingDoc } from '../lib/search';
import { listPublicListings } from './listing.service';

function docToSearchListing(d: ListingDoc): SearchListing {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    priceKobo: d.priceKobo,
    condition: d.condition,
    state: d.state,
    city: d.city,
    area: d.area,
    categorySlug: d.categorySlug,
    categoryName: d.categoryName,
    isPromoted: d.isPromoted,
    promotionTier: d.promotionTier ?? 'NONE',
    primaryImage: d.primaryImage,
    createdAt: new Date(d.createdAt).toISOString(),
    sellerVerified: d.sellerVerified ?? false,
    sellerRating: d.sellerRating ?? null,
    sellerYears: d.sellerYears ?? 0,
  };
}

function listingToSearchListing(l: PublicListing): SearchListing {
  const primary = l.images.find((i) => i.isPrimary) ?? l.images[0];
  const sellerCreatedAt = l.seller?.createdAt ? new Date(l.seller.createdAt) : new Date();
  const sellerYears = Math.floor((Date.now() - sellerCreatedAt.getTime()) / (365.25 * 24 * 3600 * 1000));
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    priceKobo: l.priceKobo,
    condition: l.condition,
    state: l.state,
    city: l.city,
    area: l.area,
    categorySlug: l.category?.slug ?? '',
    categoryName: l.category?.name ?? '',
    isPromoted: l.isPromoted,
    promotionTier: (l as any).promotionTier ?? 'NONE',
    primaryImage: primary?.url ?? null,
    createdAt: l.createdAt,
    sellerVerified: l.seller?.verification === 'VERIFIED',
    sellerRating: l.seller?.ratingAvg ?? null,
    sellerYears,
  };
}

const quote = (v: string) => `"${v.replace(/"/g, '\\"')}"`;

async function meiliSearch(q: ListingQuery): Promise<Paginated<SearchListing>> {
  const filters: string[] = ['status = "APPROVED"'];
  if (q.categorySlug) filters.push(`categorySlug = ${quote(q.categorySlug)}`);
  if (q.state) filters.push(`state = ${quote(q.state)}`);
  if (q.city) filters.push(`city = ${quote(q.city)}`);
  if (q.area) filters.push(`area = ${quote(q.area)}`);
  if (q.condition) filters.push(`condition = ${quote(q.condition)}`);
  if (q.minPriceKobo !== undefined) filters.push(`priceKobo >= ${q.minPriceKobo}`);
  if (q.maxPriceKobo !== undefined) filters.push(`priceKobo <= ${q.maxPriceKobo}`);

  const sort =
    q.sort === 'price_asc'
      ? ['priceKobo:asc']
      : q.sort === 'price_desc'
        ? ['priceKobo:desc']
        : ['createdAt:desc'];

  const res = await getListingsIndex().search(q.q ?? '', {
    filter: filters,
    sort,
    limit: q.limit,
    offset: (q.page - 1) * q.limit,
  });

  const total = res.estimatedTotalHits ?? res.hits.length;
  return {
    items: res.hits.map(docToSearchListing),
    page: q.page,
    limit: q.limit,
    total,
    totalPages: Math.ceil(total / q.limit),
  };
}

async function postgresFallback(q: ListingQuery): Promise<Paginated<SearchListing>> {
  const r = await listPublicListings(q);
  return { ...r, items: r.items.map(listingToSearchListing) };
}

// GET /search — Meili read path with graceful Postgres fallback (APP_FLOW §6).
export async function searchListings(rawQuery: unknown): Promise<Paginated<SearchListing>> {
  const q = listingQuerySchema.parse(rawQuery);
  if (isSearchConfigured) {
    try {
      return await meiliSearch(q);
    } catch (err) {
      logger.warn({ err }, 'Meili search failed — falling back to Postgres');
    }
  }
  return postgresFallback(q);
}
