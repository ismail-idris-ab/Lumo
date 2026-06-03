import { MeiliSearch, type Index } from 'meilisearch';
import { config } from '../config/env';
import type { Condition, ListingStatus } from '@lumo/shared';
import type { HydratedListing } from '../services/listing.service';

export const LISTINGS_INDEX = 'listings';
export const isSearchConfigured = Boolean(config.SEARCH_HOST && config.SEARCH_API_KEY);

// Denormalised projection stored in Meili (TRD §11). Dates as epoch ms (sortable).
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
  promotedUntil: number | null;
  createdAt: number;
  primaryImage: string | null;
  status: ListingStatus;
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
    promotedUntil: l.promotedUntil ? l.promotedUntil.getTime() : null,
    createdAt: l.createdAt.getTime(),
    primaryImage: primary?.url ?? null,
    status: l.status,
  };
}

// Relevance → promotion boost (bounded) → recency (TRD §11).
const RANKING_RULES = [
  'words',
  'typo',
  'proximity',
  'attribute',
  'sort',
  'exactness',
  'isPromoted:desc',
];

const SEARCHABLE = ['title', 'description', 'categoryName', 'categorySlug', 'state', 'city', 'area'];
const FILTERABLE = ['categorySlug', 'state', 'city', 'area', 'condition', 'priceKobo', 'isPromoted', 'status'];
const SORTABLE = ['createdAt', 'priceKobo'];

// Create the index (if absent) and apply settings. Idempotent.
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
