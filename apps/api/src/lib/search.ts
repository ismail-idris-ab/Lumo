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
    isPromoted: l.isPromoted,
    promotionTier: tier,
    tierWeight: TIER_WEIGHT[tier],
    promotedUntil: l.promotedUntil ? l.promotedUntil.getTime() : null,
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
const FILTERABLE = ['categorySlug', 'state', 'city', 'area', 'condition', 'priceKobo', 'status', 'promotionTier', 'tierWeight'];
const SORTABLE = ['createdAt', 'priceKobo', 'tierWeight'];

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
  });
  await c.waitForTask(task.taskUid);
}
