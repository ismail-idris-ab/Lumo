# ListingFeed & ListingDetail — Design Spec
_Date: 2026-06-12_

## Overview
Jiji-style redesign of the listing browse feed and listing detail page for Lumo.
Two delivery waves on a shared schema migration.

---

## Decisions Made

| Question | Answer |
|---|---|
| Promotion tier system | Full 5-tier: NONE / BOOST / TOP / DIAMOND / ENTERPRISE |
| Market-price intelligence | Yes — precomputed p25/p75 columns + BullMQ job |
| Attribute grid | Full schema-driven (attributeSchema JSONB on Category, attributes JSONB on Listing) |
| Seller ratings | Yes — new SellerReview table, avgRating stored on User |
| Implementation approach | Schema-first → Wave 1 (cards + feed) → Wave 2 (detail page) |

---

## Schema Changes (single migration PR)

### `Listing` model
```prisma
promotionTier   PromotionTier  @default(NONE)   // replaces binary isPromoted logic
attributes      Json?                            // JSONB, category-specific key/value
marketLowKobo   Int?                             // precomputed p25, null until ≥5 comps
marketHighKobo  Int?                             // precomputed p75, null until ≥5 comps
```
`isPromoted` kept as a stored boolean, set to `true` when `promotionTier != NONE` (updated on every tier write).

### `PromotionTier` enum (new)
```prisma
enum PromotionTier { NONE BOOST TOP DIAMOND ENTERPRISE }
```

### `Category` model
```prisma
attributeSchema  Json?   // Array<{ key: string, label: string, primary?: boolean, format?: string }>
```

### `User` model
```prisma
avgRating  Float?   // null until first review; recomputed on each SellerReview write
```

### `SellerReview` model (new table)
```prisma
model SellerReview {
  id        String   @id @default(cuid())
  listingId String
  buyerId   String
  sellerId  String
  score     Int      // 1–5
  body      String?
  createdAt DateTime @default(now())
  @@unique([listingId, buyerId])   // one review per transaction
}
```

### Meilisearch `ListingDoc` update
- Replace `isPromoted: boolean` with `promotionTier: string`
- Add `tierWeight: number` (NONE=0, BOOST=1, TOP=2, DIAMOND=3, ENTERPRISE=4)
- Update ranking rule: `tierWeight:desc` replaces `isPromoted:desc`

---

## Wave 1 — ListingCard Redesign + Feed

### Card chrome (TIERS object — single source of truth)
| Tier | Border | Corner badge | Trust overlays |
|---|---|---|---|
| NONE | slate-200 1px | — | — |
| BOOST | amber-400 2px | amber "Boosted" pill | — |
| TOP | orange-500 2px | orange "Top ad" pill | — |
| DIAMOND | emerald-500 2px | green "Diamond" pill | Verified ID + rating |
| ENTERPRISE | slate-800 2px | dark "Enterprise" pill | Verified ID + rating |

Trust overlays (image top-right = Verified ID badge, bottom-right = star rating pill) appear only when `sellerVerified = true` / `rating != null`.

### ListingCard props
```ts
interface SearchListing {
  // existing fields kept
  promotionTier: PromotionTier   // new — replaces isPromoted for display
  sellerVerified: boolean        // new — denormalized into ListingDoc at sync time
  sellerRating: number | null    // new — denormalized from User.avgRating at sync time
  sellerYears: number            // new — computed: floor((now - seller.createdAt) / 1yr)
}
```
`syncListingDoc` joins `listing.owner` to read `emailVerified`, `avgRating`, `createdAt` and writes them into the Meilisearch doc. On review write, re-enqueue sync for all affected seller's listings.

### ListingFeed component
- Wraps the existing grid with a **grid/list view toggle** (top-right, persisted in `useState`)
- **Grid view**: 2 cols mobile → 3 sm → 4 lg (existing pattern)
- **List view**: single column, card is horizontal (thumb left, details right)
- Tier sort is server-side (Meilisearch `tierWeight:desc`) — no client sort needed
- No filter bar in Wave 1 (existing search/category pages handle filtering)

### Files changed (Wave 1)
- `apps/api/prisma/schema.prisma` — add enum + fields
- `apps/api/prisma/migrations/` — generated migration
- `apps/api/src/lib/search.ts` — update ListingDoc, tierWeight, ranking rules
- `apps/api/src/services/search-sync.ts` — include promotionTier + tierWeight in doc
- `packages/shared/src/types.ts` — add PromotionTier enum, update SearchListing
- `apps/web/components/listing-card.tsx` — full redesign with tier chrome
- `apps/web/app/page.tsx` — wrap ListingGrid in ListingFeed with toggle
- `apps/web/app/category/[slug]/page.tsx` — same toggle treatment

---

## Wave 2 — ListingDetail Redesign

### Layout: Jiji-style 2-column (desktop)
- **Left column**: gallery → meta row → title → attribute grid → description → contact + share
- **Right sticky sidebar**: price card → seller card → actions → safety tips → "Post ad like this"
- Mobile: single column, sidebar stacks below left column

### Gallery
- Full-width image carousel with prev/next arrows
- Photo counter (`1/2`) bottom-left
- Tier badge (coloured pill) top-left corner
- Thumbnail strip below main image (active thumb highlighted)

### Attribute grid
- Rendered from `category.attributeSchema` zipped with `listing.attributes`
- 2-column grid: value (bold) above label (small caps, muted)
- `primary: true` fields shown by default; remaining hidden behind "Show more ▾" toggle
- If `attributeSchema` is null (category not seeded), falls back to showing condition + description only

### Right sidebar — price card
- Large price (₦ format, green)
- "Fixed price" tag
- "Price History" button (future feature, renders as disabled tag for now)
- Market price line: `Market price: ₦{low} ~ ₦{high}` — hidden if `marketLowKobo` is null
- "Request call back" outline button

### Right sidebar — seller card
- Avatar (initials fallback), name, "N+ years on Lumo", Verified ID badge
- `avgRating` star display (hidden if null)
- Response time string
- "Show contact" button — phone absent from initial payload; fetched lazily on click (existing contact-reveal endpoint), rate-limited
- "Start chat" button — opens existing chat flow
- "N Feedback / view all" row (links to seller profile)

### Right sidebar — actions + safety
- "Mark unavailable" + "Report Abuse" buttons (wire to existing endpoints)
- Safety tips card (static copy)
- "Post ad like this" — pre-fills new listing form with same category

### Market-price computation job
- BullMQ job: `computeMarketPrice`, runs every 6 hours (or on listing approval)
- For each listing: find comparable bucket (`categoryId + condition`), require ≥ 5 listings, compute `percentile_cont(0.25)` and `percentile_cont(0.75)` via raw Prisma query
- Write `marketLowKobo` + `marketHighKobo` back to listing row
- If < 5 comps: set both to null

### Seller review API
- `POST /api/v1/listings/:id/reviews` — auth required, buyer only, one per listing
- `GET /api/v1/users/:id/reviews` — public, paginated
- On write: recompute `User.avgRating` = avg of all scores for that seller

### Files changed (Wave 2)
- `apps/api/prisma/schema.prisma` — SellerReview table, User.avgRating
- `apps/api/src/routes/listings.ts` — review endpoints
- `apps/api/src/routes/users.ts` — GET reviews
- `apps/api/src/services/review.service.ts` — new
- `apps/api/src/jobs/main.ts` — computeMarketPrice scheduler
- `apps/api/src/services/market-price.service.ts` — new
- `packages/shared/src/types.ts` — SellerReview, PublicListing extended
- `apps/web/app/listing/[slug]/page.tsx` — full redesign
- `apps/web/components/listing/listing-detail.tsx` — new detail component
- `apps/web/components/listing/attribute-grid.tsx` — new
- `apps/web/components/listing/market-price-card.tsx` — new
- `apps/web/components/listing/seller-sidebar.tsx` — new

---

## Verification

### Wave 1
1. Run migration: `pnpm --filter api prisma:migrate`
2. Seed a listing with each `promotionTier` value
3. `pnpm --filter web dev` → homepage and category pages show cards with correct tier chrome
4. Grid/list toggle works and persists during session
5. Promoted listings sort above plain in Meilisearch results

### Wave 2
1. Seed `attributeSchema` on Phones & Tablets category
2. Seed `attributes` on a listing
3. Visit `/listing/[slug]` — attribute grid renders correctly, "Show more" toggles extra fields
4. Market price card hidden when `marketLowKobo` null; shows band when populated
5. "Show contact" reveals phone number (check rate-limit and audit log)
6. Post a seller review via API; confirm `User.avgRating` updates
