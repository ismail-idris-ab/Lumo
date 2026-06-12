# ListingFeed & ListingDetail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign listing cards with 5-tier promotion chrome and add a Jiji-style 2-column detail page with attribute grid, market-price band, and seller reviews.

**Architecture:** Wave 1 — all schema migrations first, then card/feed redesign. Wave 2 — detail page redesign (attribute grid, market price, seller reviews). Both waves share the same migration PR.

**Tech Stack:** Prisma (PostgreSQL), Meilisearch, BullMQ, Next.js App Router, Tailwind CSS, shadcn/ui

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add PromotionTier enum, new Listing fields, Category.attributeSchema, Review.listingId |
| `packages/shared/src/enums.ts` | Modify | Add PromotionTier enum |
| `packages/shared/src/types.ts` | Modify | Update SearchListing, PublicListing; add SellerReviewDTO |
| `apps/api/src/lib/search.ts` | Modify | Add tierWeight to ListingDoc, update ranking/filterable |
| `apps/api/src/services/listing.service.ts` | Modify | Add ratingAvg to listingInclude, add new fields to toPublicListing |
| `apps/api/src/services/search-sync.ts` | Modify | Include promotionTier, tierWeight, sellerVerified, sellerRating, sellerYears in doc |
| `apps/api/src/services/search.service.ts` | Modify | Map new fields in docToSearchListing |
| `apps/api/src/services/market-price.service.ts` | Create | computeMarketPrices — p25/p75 per category+condition bucket |
| `apps/api/src/services/review.service.ts` | Create | createReview, getSellerReviews, updates SellerProfile.ratingAvg/ratingCount |
| `apps/api/src/routes/listings.ts` | Modify | Add POST /:id/reviews |
| `apps/api/src/routes/index.ts` | Modify | Mount reviews router if needed |
| `apps/api/src/jobs/queues.ts` | Modify | Add computeMarketPrice job name + interval |
| `apps/api/src/jobs/main.ts` | Modify | Add market price scheduler |
| `apps/web/components/listing-card.tsx` | Modify | Full tier-chrome redesign + ListingFeed with grid/list toggle |
| `apps/web/app/page.tsx` | Modify | Use ListingFeed |
| `apps/web/app/category/[slug]/page.tsx` | Modify | Use ListingFeed |
| `apps/web/components/listing/attribute-grid.tsx` | Create | Schema-driven attribute grid |
| `apps/web/components/listing/market-price-card.tsx` | Create | Price band UI |
| `apps/web/components/listing/seller-sidebar.tsx` | Create | Right sidebar (price, seller, actions, safety) |
| `apps/web/app/listing/[slug]/page.tsx` | Modify | Jiji-style 2-col layout |
| `apps/web/lib/api.ts` | Modify | Add getSellerReviews |

---

## Task 1: Schema migration — all new fields

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/shared/src/enums.ts`

- [ ] **Step 1: Add PromotionTier enum and new fields to schema.prisma**

Open `apps/api/prisma/schema.prisma`. Make these changes:

After the existing `enum PaymentPurpose` block, add:
```prisma
enum PromotionTier {
  NONE
  BOOST
  TOP
  DIAMOND
  ENTERPRISE
}
```

In the `Listing` model, after `promotedUntil DateTime?` add:
```prisma
  promotionTier   PromotionTier  @default(NONE)
  attributes      Json?
  marketLowKobo   Int?
  marketHighKobo  Int?
```

In the `Category` model, after `order Int @default(0)` add:
```prisma
  attributeSchema Json?
```

In the `Review` model, after `id String @id @default(cuid())` add:
```prisma
  listingId String?
  listing   Listing? @relation(fields: [listingId], references: [id], onDelete: SetNull)
```
Also add `reviews Review[]` to the `Listing` model relations block (after `contactReveals ContactReveal[]`).

- [ ] **Step 2: Run migration**

```bash
pnpm --filter api prisma:migrate
```
Name the migration: `promotion_tier_attributes_market_price`

Expected: `✔ Your database is now in sync with your schema.`

- [ ] **Step 3: Add PromotionTier to shared enums**

Open `packages/shared/src/enums.ts`. Add after the last existing export:
```typescript
export type PromotionTier = 'NONE' | 'BOOST' | 'TOP' | 'DIAMOND' | 'ENTERPRISE';
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
pnpm --filter api prisma:generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/ packages/shared/src/enums.ts
git commit -m "feat(schema): add PromotionTier, listing attributes, market price, attributeSchema, review.listingId"
```

---

## Task 2: Update shared types

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Update SearchListing and PublicListing, add SellerReviewDTO**

In `packages/shared/src/types.ts`:

Replace the `SearchListing` interface with:
```typescript
export interface SearchListing {
  id: string;
  slug: string;
  title: string;
  priceKobo: number;
  condition: Condition;
  state: string;
  city: string;
  area: string | null;
  categorySlug: string;
  categoryName: string;
  isPromoted: boolean;
  promotionTier: PromotionTier;
  primaryImage: string | null;
  createdAt: string;
  sellerVerified: boolean;
  sellerRating: number | null;
  sellerYears: number;
}
```

Add the import for `PromotionTier` at the top of the import block:
```typescript
import type { PromotionTier } from './enums';
```
(add to existing import line if enums are already imported there)

Add to `PublicListing` interface after `isPromoted: boolean`:
```typescript
  promotionTier: PromotionTier;
  attributes: Record<string, unknown> | null;
  marketLowKobo: number | null;
  marketHighKobo: number | null;
```

Add `SellerReviewDTO` after the `PaymentDTO` interface:
```typescript
export interface SellerReviewDTO {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  rating: number;
  body: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Check typecheck passes**

```bash
pnpm typecheck
```

Fix any errors (likely missing `PromotionTier` import in types.ts — check `packages/shared/src/enums.ts` exports it).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/
git commit -m "feat(shared): add PromotionTier to SearchListing/PublicListing, add SellerReviewDTO"
```

---

## Task 3: Update Meilisearch ListingDoc + settings

**Files:**
- Modify: `apps/api/src/lib/search.ts`

- [ ] **Step 1: Add new fields to ListingDoc and update settings**

Replace the entire contents of `apps/api/src/lib/search.ts` with:

```typescript
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
```

- [ ] **Step 2: Check typecheck**

```bash
pnpm --filter api typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/search.ts
git commit -m "feat(search): add promotionTier, tierWeight, seller trust fields to ListingDoc"
```

---

## Task 4: Update listing service (listingInclude + toPublicListing)

**Files:**
- Modify: `apps/api/src/services/listing.service.ts`

- [ ] **Step 1: Add ratingAvg and ratingCount to listingInclude**

Find the `listingInclude` constant. Update the `owner` select to add `ratingAvg` and `ratingCount`:

```typescript
export const listingInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] as const },
  category: { select: { id: true, name: true, slug: true } },
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
```

- [ ] **Step 2: Add attributeSchema to CategorySummary and listingInclude**

In `packages/shared/src/types.ts`, update `CategorySummary`:
```typescript
export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  attributeSchema: unknown | null;
}
```

In `apps/api/src/services/listing.service.ts`, update the `category` select in `listingInclude`:
```typescript
  category: { select: { id: true, name: true, slug: true, attributeSchema: true } },
```

In `apps/api/src/routes/categories.ts` (or wherever categories are returned), add `attributeSchema` to the select if it uses a separate query.

- [ ] **Step 3: Add new fields to toPublicListing**

In `toPublicListing`, after `isPromoted: l.isPromoted,` add:
```typescript
    promotionTier: (l.promotionTier ?? 'NONE') as import('@lumo/shared').PromotionTier,
    attributes: l.attributes as Record<string, unknown> | null,
    marketLowKobo: l.marketLowKobo,
    marketHighKobo: l.marketHighKobo,
```

Also update the `seller` object to include rating:
```typescript
    seller: {
      id: l.owner.id,
      name: l.owner.name,
      avatarUrl: l.owner.avatarUrl,
      createdAt: l.owner.createdAt.toISOString(),
      verification: l.owner.sellerProfile?.verification ?? null,
      ratingAvg: l.owner.sellerProfile?.ratingAvg ?? null,
      ratingCount: l.owner.sellerProfile?.ratingCount ?? 0,
    },
```

Update `SellerSummary` in `packages/shared/src/types.ts` to match:
```typescript
export interface SellerSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  verification: VerificationStatus | null;
  ratingAvg: number | null;
  ratingCount: number;
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter api typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/listing.service.ts packages/shared/src/types.ts
git commit -m "feat(listing): include seller ratingAvg/ratingCount, promotionTier, attributes in public response"
```

---

## Task 5: Update search-sync and search.service

**Files:**
- Modify: `apps/api/src/services/search-sync.ts` (no code changes needed — `buildListingDoc` already uses `listingInclude`, which now has `ratingAvg`)
- Modify: `apps/api/src/services/search.service.ts`

- [ ] **Step 1: Update docToSearchListing in search.service.ts**

Open `apps/api/src/services/search.service.ts`. Replace `docToSearchListing`:

```typescript
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
```

Also update `listingToSearchListing` (the Postgres fallback) to include new fields:

```typescript
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
    promotionTier: l.promotionTier ?? 'NONE',
    primaryImage: primary?.url ?? null,
    createdAt: l.createdAt,
    sellerVerified: l.seller?.verification === 'VERIFIED',
    sellerRating: l.seller?.ratingAvg ?? null,
    sellerYears,
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter api typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/search.service.ts apps/api/src/services/search-sync.ts
git commit -m "feat(search): map promotionTier + seller trust fields in search results"
```

---

## Task 6: Redesign ListingCard with tier chrome

**Files:**
- Modify: `apps/web/components/listing-card.tsx`

- [ ] **Step 1: Replace listing-card.tsx**

```typescript
'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutGrid, List } from 'lucide-react';
import type { SearchListing, PromotionTier } from '@lumo/shared';
import { formatNaira, locationLabel } from '@/lib/format';

// Single source of truth for tier appearance.
const TIERS: Record<PromotionTier, {
  border: string;
  badge: { label: string; cls: string } | null;
  trustOverlays: boolean;
}> = {
  NONE:       { border: 'border border-slate-200',          badge: null,                                                       trustOverlays: false },
  BOOST:      { border: 'border-2 border-amber-400',        badge: { label: 'Boosted',        cls: 'bg-amber-100 text-amber-800' },   trustOverlays: false },
  TOP:        { border: 'border-2 border-orange-500',       badge: { label: 'Top ad',         cls: 'bg-orange-100 text-orange-800' }, trustOverlays: false },
  DIAMOND:    { border: 'border-2 border-emerald-500',      badge: { label: 'Diamond',        cls: 'bg-emerald-100 text-emerald-800' }, trustOverlays: true },
  ENTERPRISE: { border: 'border-2 border-slate-800',        badge: { label: 'Enterprise',     cls: 'bg-slate-900 text-white' },       trustOverlays: true },
};

function TierBadge({ tier }: { tier: PromotionTier }) {
  const b = TIERS[tier].badge;
  if (!b) return null;
  return (
    <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-bold ${b.cls}`}>
      {b.label}
    </span>
  );
}

function TrustOverlays({ verified, rating }: { verified: boolean; rating: number | null }) {
  return (
    <>
      {verified && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-sky-700 shadow-sm">
          ✔ Verified ID
        </span>
      )}
      {rating != null && (
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-sm">
          ★ {rating.toFixed(1)}
        </span>
      )}
    </>
  );
}

export function ListingCard({ item }: { item: SearchListing }) {
  const tier = (item.promotionTier ?? 'NONE') as PromotionTier;
  const t = TIERS[tier];
  return (
    <Link
      href={`/listing/${item.slug}`}
      className={`group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md ${t.border}`}
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {item.primaryImage ? (
          <Image
            src={item.primaryImage}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        <TierBadge tier={tier} />
        {t.trustOverlays && (
          <TrustOverlays verified={item.sellerVerified} rating={item.sellerRating} />
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="text-base font-bold text-emerald-700">{formatNaira(item.priceKobo)}</p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{item.title}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          📍 {locationLabel(item.state, item.city, item.area)}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.condition === 'NEW' ? 'New' : item.condition === 'USED' ? 'Used' : 'For parts'}</span>
        </div>
      </div>
    </Link>
  );
}

function ListingRow({ item }: { item: SearchListing }) {
  const tier = (item.promotionTier ?? 'NONE') as PromotionTier;
  const t = TIERS[tier];
  return (
    <Link
      href={`/listing/${item.slug}`}
      className={`group flex overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md ${t.border}`}
    >
      <div className="relative w-32 shrink-0 overflow-hidden bg-muted sm:w-44">
        {item.primaryImage ? (
          <Image src={item.primaryImage} alt={item.title} fill sizes="176px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
        <TierBadge tier={tier} />
        {t.trustOverlays && (
          <TrustOverlays verified={item.sellerVerified} rating={item.sellerRating} />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-base font-bold text-emerald-700">{formatNaira(item.priceKobo)}</p>
        <h3 className="text-sm font-medium leading-snug text-slate-800">{item.title}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          📍 {locationLabel(item.state, item.city, item.area)}
        </p>
        <span className="mt-1 w-fit rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {item.condition === 'NEW' ? 'New' : item.condition === 'USED' ? 'Used' : 'For parts'}
        </span>
      </div>
    </Link>
  );
}

export function ListingGrid({ items }: { items: SearchListing[] }) {
  if (items.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No listings found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => <ListingCard key={item.id} item={item} />)}
    </div>
  );
}

export function ListingFeed({ items }: { items: SearchListing[] }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setView('grid')}
            className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`rounded-md p-1.5 ${view === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No listings found.</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => <ListingCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => <ListingRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck web**

```bash
pnpm --filter web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/listing-card.tsx
git commit -m "feat(web): tier-chrome ListingCard + grid/list ListingFeed component"
```

---

## Task 7: Wire ListingFeed into homepage and category pages

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/category/[slug]/page.tsx`

- [ ] **Step 1: Update homepage**

In `apps/web/app/page.tsx`, replace the `ListingGrid` import with `ListingFeed`:

```typescript
import { ListingFeed } from '@/components/listing-card';
```

Replace `<ListingGrid items={results.items} />` with:

```tsx
<ListingFeed items={results.items} />
```

- [ ] **Step 2: Update category page**

In `apps/web/app/category/[slug]/page.tsx`, replace the `ListingGrid` import with `ListingFeed`:

```typescript
import { ListingFeed } from '@/components/listing-card';
```

Replace `<ListingGrid items={results.items} />` with:

```tsx
<ListingFeed items={results.items} />
```

- [ ] **Step 3: Typecheck + verify**

```bash
pnpm --filter web typecheck
```

Then run both servers and visit `http://localhost:3000` — verify cards render with tier chrome and grid/list toggle appears.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/category/
git commit -m "feat(web): use ListingFeed with tier chrome on homepage and category pages"
```

---

## Task 8: Market price service + BullMQ job

**Files:**
- Create: `apps/api/src/services/market-price.service.ts`
- Modify: `apps/api/src/jobs/queues.ts`
- Modify: `apps/api/src/jobs/main.ts`

- [ ] **Step 1: Create market-price.service.ts**

```typescript
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const MIN_COMPS = 5;

// Compute p25/p75 price band for every (categoryId, condition) bucket with ≥ MIN_COMPS listings.
// Writes marketLowKobo + marketHighKobo back to each listing row; clears them when insufficient comps.
export async function computeMarketPrices(): Promise<void> {
  // Get all distinct buckets.
  const buckets = await prisma.listing.groupBy({
    by: ['categoryId', 'condition'],
    where: { status: 'APPROVED', deletedAt: null, expiresAt: { gt: new Date() } },
    _count: { id: true },
  });

  let updated = 0;
  for (const bucket of buckets) {
    const { categoryId, condition, _count } = bucket;

    if (_count.id < MIN_COMPS) {
      // Not enough comps — clear market price for this bucket.
      await prisma.listing.updateMany({
        where: { categoryId, condition, status: 'APPROVED', deletedAt: null },
        data: { marketLowKobo: null, marketHighKobo: null },
      });
      continue;
    }

    // Fetch all approved prices for this bucket, sorted ascending.
    const listings = await prisma.listing.findMany({
      where: { categoryId, condition, status: 'APPROVED', deletedAt: null, expiresAt: { gt: new Date() } },
      select: { priceKobo: true },
      orderBy: { priceKobo: 'asc' },
    });

    const prices = listings.map((l) => l.priceKobo);
    const p25 = percentile(prices, 0.25);
    const p75 = percentile(prices, 0.75);

    await prisma.listing.updateMany({
      where: { categoryId, condition },
      data: { marketLowKobo: Math.round(p25), marketHighKobo: Math.round(p75) },
    });
    updated += listings.length;
  }

  logger.info({ buckets: buckets.length, listings: updated }, 'Market prices computed');
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
```

- [ ] **Step 2: Add job name + interval to queues.ts**

In `apps/api/src/jobs/queues.ts`, add to `JOB_NAMES`:
```typescript
  computeMarketPrice: 'compute-market-price',
```

Add after `RECONCILE_INTERVAL_MS`:
```typescript
// Market price recompute — every 6 hours.
export const MARKET_PRICE_INTERVAL_MS = 6 * 60 * 60 * 1000;
```

- [ ] **Step 3: Add scheduler to main.ts**

In `apps/api/src/jobs/main.ts`, add import:
```typescript
import { computeMarketPrices } from '../services/market-price.service';
import { MARKET_PRICE_INTERVAL_MS } from './queues';
```

In the `main()` function, after the maintenance queue setup (before the search queue block), add:
```typescript
  await maintenance.upsertJobScheduler(
    JOB_NAMES.computeMarketPrice,
    { every: MARKET_PRICE_INTERVAL_MS },
    { name: JOB_NAMES.computeMarketPrice },
  );
```

In the maintenance worker handler, add:
```typescript
      if (job.name === JOB_NAMES.computeMarketPrice) return computeMarketPrices();
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter api typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/market-price.service.ts apps/api/src/jobs/
git commit -m "feat(jobs): market price p25/p75 computation job every 6h"
```

---

## Task 9: Review service + API route

**Files:**
- Create: `apps/api/src/services/review.service.ts`
- Modify: `apps/api/src/routes/listings.ts`

- [ ] **Step 1: Create review.service.ts**

```typescript
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { z } from 'zod';
import type { SellerReviewDTO } from '@lumo/shared';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

export async function createReview(
  listingId: string,
  authorId: string,
  data: z.infer<typeof createReviewSchema>,
): Promise<SellerReviewDTO> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true, status: true },
  });
  if (!listing) throw new AppError('NOT_FOUND', 'Listing not found', 404);
  if (listing.ownerId === authorId) throw new AppError('FORBIDDEN', 'Cannot review your own listing', 403);

  // One review per (listing, author).
  const existing = await prisma.review.findFirst({ where: { listingId, authorId } });
  if (existing) throw new AppError('CONFLICT', 'You already reviewed this listing', 409);

  const review = await prisma.review.create({
    data: {
      listingId,
      sellerId: listing.ownerId,
      authorId,
      rating: data.rating,
      body: data.body ?? null,
    },
    include: { author: { select: { name: true, avatarUrl: true } } },
  });

  // Recompute seller's ratingAvg and ratingCount.
  const agg = await prisma.review.aggregate({
    where: { sellerId: listing.ownerId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.sellerProfile.upsert({
    where: { userId: listing.ownerId },
    create: {
      userId: listing.ownerId,
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
    update: {
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
  });

  return toDTO(review);
}

export async function getSellerReviews(
  sellerId: string,
  page = 1,
  limit = 20,
): Promise<{ reviews: SellerReviewDTO[]; total: number }> {
  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { sellerId },
      include: { author: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: { sellerId } }),
  ]);
  return { reviews: reviews.map(toDTO), total };
}

type ReviewWithAuthor = Awaited<ReturnType<typeof prisma.review.findFirst>> & {
  author: { name: string; avatarUrl: string | null };
};

function toDTO(r: ReviewWithAuthor): SellerReviewDTO {
  return {
    id: r!.id,
    authorId: r!.authorId,
    authorName: r!.author.name,
    authorAvatar: r!.author.avatarUrl,
    rating: r!.rating,
    body: r!.body,
    createdAt: r!.createdAt.toISOString(),
  };
}
```

- [ ] **Step 2: Add review route to listings.ts**

In `apps/api/src/routes/listings.ts`, add after the existing imports:
```typescript
import { createReview, createReviewSchema } from '../services/review.service';
```

Add this route at the end of the file (before module.exports or after the last route):
```typescript
// POST /api/v1/listings/:id/reviews — buyer leaves a review for the seller.
listingsRouter.post(
  '/:id/reviews',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = createReviewSchema.parse(req.body);
    const review = await createReview(param(req, 'id'), req.user!.id, data);
    res.status(201).json({ review });
  }),
);

// GET /api/v1/listings/:id/reviews — public, paginated seller reviews for a listing's seller.
listingsRouter.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const listing = await prisma.listing.findUnique({
      where: { id: param(req, 'id') },
      select: { ownerId: true },
    });
    if (!listing) throw new AppError('NOT_FOUND', 'Listing not found', 404);
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const { getSellerReviews } = await import('../services/review.service');
    const result = await getSellerReviews(listing.ownerId, page, limit);
    res.json(result);
  }),
);
```

Add missing imports at top of `listings.ts`:
```typescript
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
```
(only if not already imported)

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter api typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/review.service.ts apps/api/src/routes/listings.ts
git commit -m "feat(api): seller review create + list endpoints, updates SellerProfile ratingAvg"
```

---

## Task 10: Update web api.ts + create detail page components

**Files:**
- Modify: `apps/web/lib/api.ts`
- Create: `apps/web/components/listing/attribute-grid.tsx`
- Create: `apps/web/components/listing/market-price-card.tsx`
- Create: `apps/web/components/listing/seller-sidebar.tsx`

- [ ] **Step 1: Add getSellerReviews to api.ts**

In `apps/web/lib/api.ts`, add import for `SellerReviewDTO`:
```typescript
import type { CategorySummary, Paginated, PublicListing, SearchListing, SellerReviewDTO } from '@lumo/shared';
```

Add function:
```typescript
export async function getSellerReviews(
  listingId: string,
): Promise<{ reviews: SellerReviewDTO[]; total: number }> {
  const data = await get<{ reviews: SellerReviewDTO[]; total: number }>(
    `/listings/${encodeURIComponent(listingId)}/reviews`,
    60,
  );
  return data ?? { reviews: [], total: 0 };
}
```

- [ ] **Step 2: Create attribute-grid.tsx**

Create `apps/web/components/listing/attribute-grid.tsx`:

```tsx
'use client';
import { useState } from 'react';

export interface AttributeField {
  key: string;
  label: string;
  primary?: boolean;
  format?: string; // e.g. "{v} cc"
}

function formatValue(raw: unknown, fmt?: string): string {
  if (raw == null) return '';
  const str = String(raw);
  if (!fmt) return str;
  return fmt.replace('{v}', str);
}

interface Props {
  schema: AttributeField[];
  attributes: Record<string, unknown>;
}

export function AttributeGrid({ schema, attributes }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visible = schema.filter((f) => attributes[f.key] != null);
  const primary = visible.filter((f) => f.primary !== false && (f.primary || visible.indexOf(f) < 8));
  const secondary = visible.filter((f) => !primary.includes(f));
  const shown = expanded ? visible : primary;

  if (shown.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {shown.map((f) => (
          <div key={f.key}>
            <p className="text-sm font-semibold text-slate-800">
              {formatValue(attributes[f.key], f.format)}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{f.label}</p>
          </div>
        ))}
      </div>
      {secondary.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex w-full items-center justify-end gap-1 text-sm font-medium text-emerald-700"
        >
          {expanded ? 'Hide options ▴' : 'Show more ▾'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create market-price-card.tsx**

Create `apps/web/components/listing/market-price-card.tsx`:

```tsx
import { formatNaira } from '@/lib/format';

interface Props {
  priceKobo: number;
  marketLowKobo: number;
  marketHighKobo: number;
}

export function MarketPriceCard({ priceKobo, marketLowKobo, marketHighKobo }: Props) {
  const span = marketHighKobo - marketLowKobo;
  const rel = span > 0 ? (priceKobo - marketLowKobo) / span : 0.5;
  const markerPct = Math.min(Math.max(rel, 0), 1) * 100;
  const belowMarket = priceKobo < marketLowKobo;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-600">Market price</span>
        <span className="font-semibold text-slate-800">
          {formatNaira(marketLowKobo)} ~ {formatNaira(marketHighKobo)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400">
        <div
          className="absolute -top-1 h-4 w-1 rounded-full bg-slate-900"
          style={{ left: `calc(${markerPct}% - 2px)` }}
        />
      </div>
      {belowMarket && (
        <p className="mt-2 text-xs font-medium text-emerald-700">
          Priced below the typical range — verify condition before paying.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create seller-sidebar.tsx**

Create `apps/web/components/listing/seller-sidebar.tsx`:

```tsx
import type { PublicListing, SellerReviewDTO } from '@lumo/shared';
import { formatNaira } from '@/lib/format';
import { MarketPriceCard } from './market-price-card';
import { ListingActions } from './listing-actions';
import { SITE_NAME } from '@/lib/seo';

interface Props {
  listing: PublicListing;
  reviews: SellerReviewDTO[];
  reviewTotal: number;
}

export function SellerSidebar({ listing, reviews, reviewTotal }: Props) {
  const seller = listing.seller;

  const sellerYears = seller
    ? Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  return (
    <div className="space-y-3">
      {/* Price card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-2xl font-extrabold text-emerald-700">{formatNaira(listing.priceKobo)}</p>
        <span className="mt-1 inline-block rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
          Fixed price
        </span>
        {listing.marketLowKobo != null && listing.marketHighKobo != null && (
          <div className="mt-3">
            <MarketPriceCard
              priceKobo={listing.priceKobo}
              marketLowKobo={listing.marketLowKobo}
              marketHighKobo={listing.marketHighKobo}
            />
          </div>
        )}
        <button className="mt-3 w-full rounded-lg border border-emerald-600 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
          Request call back
        </button>
      </div>

      {/* Seller card */}
      {seller && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              {seller.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{seller.name}</p>
              <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                {sellerYears >= 1 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    {sellerYears}+ yrs on {SITE_NAME}
                  </span>
                )}
                {seller.verification === 'VERIFIED' && (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                    ✔ Verified ID
                  </span>
                )}
                {seller.ratingAvg != null && seller.ratingAvg > 0 && (
                  <span className="text-amber-600">★ {seller.ratingAvg.toFixed(1)}</span>
                )}
              </div>
            </div>
          </div>

          {listing.seller && (
            <ListingActions
              listingId={listing.id}
              slug={listing.slug}
              sellerId={listing.seller.id}
            />
          )}

          {reviewTotal > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 px-3 py-2.5">
              <span className="text-sm font-medium text-amber-800">😊 {reviewTotal} Feedback</span>
              <span className="text-sm font-medium text-emerald-700">view all ›</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg border border-sky-400 py-2.5 text-xs font-medium text-sky-600">
          Mark unavailable
        </button>
        <button className="flex-1 rounded-lg border border-rose-400 py-2.5 text-xs font-medium text-rose-600">
          🚩 Report Abuse
        </button>
      </div>

      {/* Safety tips */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-center text-sm font-semibold">Safety tips</h3>
        <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
          <li>Avoid paying in advance, even for delivery.</li>
          <li>Meet the seller at a safe public place.</li>
          <li>Inspect the item to ensure it's what you need.</li>
          <li>Only pay if you're satisfied.</li>
        </ul>
        <button className="mt-3 w-full rounded-lg border border-emerald-600 py-2.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 hover:bg-emerald-50">
          Post ad like this
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter web typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/api.ts apps/web/components/listing/
git commit -m "feat(web): attribute-grid, market-price-card, seller-sidebar components"
```

---

## Task 11: Redesign listing detail page

**Files:**
- Modify: `apps/web/app/listing/[slug]/page.tsx`

- [ ] **Step 1: Replace the detail page**

```tsx
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getListing, getSellerReviews } from '@/lib/api';
import { formatNaira, locationLabel } from '@/lib/format';
import { AttributeGrid } from '@/components/listing/attribute-grid';
import { SellerSidebar } from '@/components/listing/seller-sidebar';
import { SITE_NAME, breadcrumbJsonLd, jsonLdScript, productJsonLd } from '@/lib/seo';

export const revalidate = 60;

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New',
  USED: 'Used',
  FOR_PARTS: 'For parts',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: 'Listing not found' };
  const title = `${listing.title} — ${formatNaira(listing.priceKobo)}`;
  const description = listing.description.slice(0, 160);
  const image = listing.images.find((i) => i.isPrimary)?.url ?? listing.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/listing/${listing.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [listing, reviewData] = await Promise.all([
    getListing(slug),
    getListing(slug).then((l) => (l ? getSellerReviews(l.id) : { reviews: [], total: 0 })),
  ]);
  if (!listing) notFound();

  const primary = listing.images.find((i) => i.isPrimary) ?? listing.images[0];
  const otherImages = listing.images.filter((i) => !i.isPrimary).slice(0, 4);

  // attributeSchema comes from category — fetch or use null fallback.
  // Phase: seed category.attributeSchema separately; component handles null gracefully.
  const attributeSchema = (listing.category as { attributeSchema?: unknown })?.attributeSchema as
    | { key: string; label: string; primary?: boolean; format?: string }[]
    | null
    | undefined;

  return (
    <main className="container py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(productJsonLd(listing))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            ...(listing.category
              ? [{ name: listing.category.name, url: `/category/${listing.category.slug}` }]
              : []),
            { name: listing.title, url: `/listing/${listing.slug}` },
          ]),
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">
          {/* Gallery */}
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: '4/3' }}>
              {primary ? (
                <Image
                  src={primary.url}
                  alt={listing.title}
                  fill
                  sizes="(max-width:1024px) 100vw, 65vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              {listing.isPromoted && (
                <span className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                  Promoted
                </span>
              )}
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
                📷 1/{listing.images.length || 1}
              </span>
            </div>
            {otherImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {otherImages.map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    <Image src={img.url} alt={listing.title} fill sizes="25vw" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>📍 {locationLabel(listing.state, listing.city, listing.area)}</span>
            <span>🕐 {new Date(listing.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {listing.isPromoted && (
              <span className="rounded border border-slate-200 px-2 py-0.5 text-xs">Promoted</span>
            )}
            <span className="ml-auto">👁 {listing.viewsCount} views</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900">{listing.title}</h1>

          {/* Attribute grid */}
          {attributeSchema && listing.attributes ? (
            <AttributeGrid
              schema={attributeSchema}
              attributes={listing.attributes as Record<string, unknown>}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">{CONDITION_LABEL[listing.condition]}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Condition</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {listing.description}
            </p>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <SellerSidebar
            listing={listing}
            reviews={reviewData.reviews}
            reviewTotal={reviewData.total}
          />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter web typecheck
```

- [ ] **Step 3: Visual check**

Run both servers:
```bash
# Terminal 1
pnpm --filter api dev
# Terminal 2
pnpm --filter web dev
```

Visit `http://localhost:3000/listing/<any-approved-slug>`. Verify:
- Gallery renders with photo counter
- Attribute grid shows (or condition fallback)
- Right sidebar shows price + seller card + safety tips
- Market price card hidden (expected — columns are null until worker runs)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/listing/
git commit -m "feat(web): Jiji-style 2-col listing detail page (gallery, attribute grid, seller sidebar)"
```

---

## Task 12: Seed attributeSchema for Phones & Tablets category + smoke test

**Files:**
- No code change — uses Prisma seed or a one-off script

- [ ] **Step 1: Run a seed snippet via ts-node to add attributeSchema**

Create a temp file `apps/api/src/scripts/seed-phone-schema.ts`:

```typescript
import { prisma } from '../lib/prisma';

async function main() {
  await prisma.category.update({
    where: { slug: 'phones-tablets' },
    data: {
      attributeSchema: [
        { key: 'brand',            label: 'Brand',            primary: true },
        { key: 'model',            label: 'Model',            primary: true },
        { key: 'storage',          label: 'Internal storage', primary: true },
        { key: 'ram',              label: 'RAM',              primary: true },
        { key: 'condition2',       label: 'Second condition', primary: true },
        { key: 'os',               label: 'Operating system', primary: true },
        { key: 'screen',           label: 'Screen size',      format: '{v} inches' },
        { key: 'battery',          label: 'Battery',          format: '{v} mAh' },
        { key: 'mainCamera',       label: 'Main camera' },
        { key: 'selfieCamera',     label: 'Selfie camera' },
        { key: 'exchange',         label: 'Exchange possible' },
      ],
    },
  });
  console.log('Done');
  await prisma.$disconnect();
}
main();
```

Run it:
```bash
cd apps/api && npx tsx src/scripts/seed-phone-schema.ts
```

Expected: `Done`

- [ ] **Step 2: Delete the temp script**

```bash
rm apps/api/src/scripts/seed-phone-schema.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: seed attributeSchema for phones-tablets category"
```

---

## Verification Checklist

After all tasks complete:

1. **Wave 1 — Cards**
   - Visit `http://localhost:3000` — listing cards show with `border-slate-200` (NONE tier)
   - Seed a listing with `promotionTier: 'ENTERPRISE'` via API or Prisma Studio — card shows dark border + Enterprise badge
   - Grid/list toggle works, persists during navigation within the page

2. **Wave 2 — Detail page**
   - Visit `/listing/<slug>` — 2-column layout on desktop, single column on mobile
   - If listing has `attributes` JSONB set, attribute grid renders; "Show more" toggles secondary fields
   - Market price card hidden when `marketLowKobo` is null (expected until worker runs market-price job)
   - Seller sidebar shows name, years, verified badge, safety tips
   - `POST /api/v1/listings/:id/reviews` with a Bearer token creates a review; `SellerProfile.ratingAvg` updates

3. **Typecheck + lint clean**
   ```bash
   pnpm lint && pnpm typecheck
   ```
