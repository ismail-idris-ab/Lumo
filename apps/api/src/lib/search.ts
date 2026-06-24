import { MeiliSearch, type Index } from 'meilisearch';
import { config } from '../config/env';
import type { Condition, ListingStatus, PromotionTier } from '@lumo/shared';
import type { HydratedListing } from '../services/listing.service';

export const LISTINGS_INDEX = 'listings';
export const isSearchConfigured = Boolean(config.SEARCH_HOST && config.SEARCH_API_KEY);

export const TIER_WEIGHT: Record<PromotionTier, number> = {
  NONE: 0,
  BOOST: 1,
  TOP: 2,
  DIAMOND: 3,
  ENTERPRISE: 4,
};

export interface ListingDoc {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  state: string;
  city: string;
  area: string | null;
  priceKobo: number;
  condition: Condition;
  isPromoted: boolean;
  promotionTier: PromotionTier;
  tierWeight: number;
  promotedUntil: number | null;
  expiresAt: number;
  createdAt: number;
  primaryImage: string | null;
  status: ListingStatus;
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  sellerRating: number | null;
  sellerYears: number;
}

let client: MeiliSearch | null = null;
export function getSearchClient(): MeiliSearch {
  if (!isSearchConfigured) throw new Error('Search is not configured (SEARCH_HOST/SEARCH_API_KEY)');
  client ??= new MeiliSearch({ host: config.SEARCH_HOST!, apiKey: config.SEARCH_API_KEY });
  return client;
}

export function getListingsIndex(): Index<ListingDoc> {
  return getSearchClient().index<ListingDoc>(LISTINGS_INDEX);
}

export function buildListingDoc(l: HydratedListing): ListingDoc {
  const primary = l.images.find((i) => i.isPrimary) ?? l.images[0];
  const tier = (l.promotionTier ?? 'NONE') as PromotionTier;
  // promotionTier/TIER_WEIGHT stay dormant for a future multi-tier feature — today's seeded
  // packages are single-tier (duration only), so the real signal is isPromoted + an unexpired
  // promotedUntil. Deriving it here (rather than trusting the stored isPromoted) also makes a
  // re-synced doc self-correct even if the expiry sweep hasn't run yet.
  const promoted = l.isPromoted && !!l.promotedUntil && l.promotedUntil > new Date();
  const createdAt = l.owner.createdAt instanceof Date ? l.owner.createdAt : new Date(l.owner.createdAt);
  const sellerYears = Math.floor((Date.now() - createdAt.getTime()) / (365.25 * 24 * 3600 * 1000));
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    description: l.description,
    categorySlug: l.category.slug,
    categoryName: l.category.name,
    state: l.state,
    city: l.city,
    area: l.area,
    priceKobo: l.priceKobo,
    condition: l.condition,
    isPromoted: promoted,
    promotionTier: tier,
    tierWeight: promoted ? 1 : 0,
    promotedUntil: l.promotedUntil ? l.promotedUntil.getTime() : null,
    expiresAt: l.expiresAt.getTime(),
    createdAt: l.createdAt.getTime(),
    primaryImage: primary?.url ?? null,
    status: l.status,
    sellerId: l.owner.id,
    sellerName: l.owner.name,
    sellerVerified: l.owner.sellerProfile?.verification === 'VERIFIED',
    sellerRating: l.owner.sellerProfile?.ratingAvg && l.owner.sellerProfile.ratingAvg > 0
      ? l.owner.sellerProfile.ratingAvg
      : null,
    sellerYears,
  };
}

const RANKING_RULES = [
  'words',
  'typo',
  'proximity',
  'attribute',
  'sort',
  'exactness',
  'tierWeight:desc',
];

const SEARCHABLE = ['title', 'description', 'categoryName', 'categorySlug', 'state', 'city', 'area'];
// Exported so the read-time expiry filter's prerequisite (expiresAt registered here) is
// directly testable — adding the query filter without this makes every Meili search throw
// on an unknown filter field (silently falls back to Postgres via the try/catch).
export const FILTERABLE = ['categorySlug', 'state', 'city', 'area', 'condition', 'priceKobo', 'status', 'promotionTier', 'tierWeight', 'expiresAt'];
const SORTABLE = ['createdAt', 'priceKobo', 'tierWeight'];

// Meili's default maxTotalHits (1000) silently throws past that offset, which the existing
// try/catch turns into a quiet fallback to Postgres — deep pages switch data sources instead
// of failing cleanly. Raised here AND clamped against in meiliSearch (search.service.ts) —
// raising this alone doesn't fix anything past the new cap either.
export const MAX_TOTAL_HITS = 10_000;

export async function ensureSearchIndex(): Promise<void> {
  const c = getSearchClient();
  try {
    const task = await c.createIndex(LISTINGS_INDEX, { primaryKey: 'id' });
    await c.waitForTask(task.taskUid);
  } catch {
    // already exists — ignore
  }
  const index = c.index(LISTINGS_INDEX);
  const task = await index.updateSettings({
    searchableAttributes: SEARCHABLE,
    filterableAttributes: FILTERABLE,
    sortableAttributes: SORTABLE,
    rankingRules: RANKING_RULES,
    pagination: { maxTotalHits: MAX_TOTAL_HITS },
  });
  await c.waitForTask(task.taskUid);
}
