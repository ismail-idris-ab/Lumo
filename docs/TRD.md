# Lumo — Technical Requirements Document (TRD)

> Version: 1.0 (Pre-build planning) · Companion to PRD.md and APP_FLOW.md

---

## 0. Stack Decision (read first)

The reference architecture below follows the project spec: **Next.js + NestJS/Express + PostgreSQL/Prisma + Meilisearch**. For Lumo's relational, transactional core (payments, subscriptions, audit logs, listing↔report↔user relationships, promotion expiry), a relational DB with strong constraints is the better fit, so it is documented as primary.

**MERN alternative (your native stack):** everything except the data layer maps cleanly to MERN. If you prefer MongoDB + Mongoose, the swap is: Prisma → Mongoose schemas, Postgres relations → references/embedding, Next.js stays (it is React-based), NestJS/Express stays (Express is the "E" in MERN). The product/flow docs are stack-agnostic. **Confirm this before Phase 0** — it's the one decision that changes the schema sections. Trade-off summary:

|                                                     | PostgreSQL + Prisma          | MongoDB + Mongoose (MERN)                         |
| --------------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| Relational integrity (payments, subs, audit)        | Strong (FKs, transactions)   | App-enforced; multi-doc txns possible but heavier |
| Your velocity                                       | Lower (new for you)          | Higher (familiar)                                 |
| Complex filters/joins (search prefilter, analytics) | Native SQL                   | Aggregation pipelines                             |
| Migrations                                          | First-class (Prisma Migrate) | Schema-on-read; needs discipline                  |
| Recommendation                                      | **Preferred for this app**   | Acceptable; fine if you prioritise speed          |

Sections marked **[DB-specific]** below are the only ones that change with this choice.

---

## 1. Recommended Architecture

A decoupled, service-oriented monolith (modular monolith) — not microservices in v1.

```
                 ┌─────────────────────────────────────────────┐
   Mobile/Web ──▶│  Next.js (SSR/ISR)  — public + dashboards     │
                 │  TS · Tailwind · shadcn/ui · RHF · Zod        │
                 └───────────────┬──────────────────────────────┘
                                 │ REST (JSON) + WebSocket
                 ┌───────────────▼──────────────────────────────┐
                 │  API: NestJS (or Express)                     │
                 │  Modules: auth, users, listings, search,      │
                 │  chat, reports, payments, admin, notifications│
                 └───┬─────────┬──────────┬──────────┬───────────┘
                     │         │          │          │
        ┌────────────▼──┐ ┌────▼─────┐ ┌──▼──────┐ ┌─▼──────────┐
        │ PostgreSQL    │ │ Redis +  │ │ Meili/  │ │ Cloudinary │
        │ (Prisma)      │ │ BullMQ   │ │ Typesense│ │ / S3       │
        └───────────────┘ └──────────┘ └─────────┘ └────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │ Paystack · Resend/SMTP │
                     └────────────────────────┘
```

**Principles:** stateless API behind a load balancer; Redis for sessions-adjacent state, queues, rate limiting, and Socket.IO adapter; search engine as the read path for browse/search; Postgres as source of truth; async jobs for emails, image post-processing, expiry, and webhook retries.

---

## 2. Frontend Architecture

- **Next.js (App Router)** + **TypeScript**. Public pages use **SSR/ISR** for SEO; dashboards are client-rendered with auth guards.
- **Tailwind CSS + shadcn/ui** for design system; mobile-first tokens (360px baseline).
- **React Hook Form + Zod** for all forms with shared schemas (reused on the API for validation parity).
- **Data fetching:** TanStack Query for client data; server components/`fetch` for SSR pages.
- **State:** local + Query cache; minimal global state (auth/session, unread counts).
- **Realtime:** Socket.IO client for chat + notifications, connected post-auth.
- **Images:** `next/image` with Cloudinary loader; responsive `srcset`, lazy loading.
- **Performance:** route-level code splitting, minimal JS on `/`, `/search`, `/listing/*`, `/category/*`.

---

## 3. Backend Architecture

- **NestJS** (recommended for structure/RBAC guards/DI) or **Express** (lighter, MERN-native). Modular by domain.
- **REST API** with versioned base `/api/v1`. JSON only.
- **Validation:** Zod (or class-validator in Nest) at the boundary; reject early.
- **Auth:** JWT access (15 min) + refresh (httpOnly cookie, rotating) + RBAC guards.
- **Jobs:** BullMQ workers (email, image processing, expiry sweeps, webhook reconciliation, search reindex).
- **Search sync:** outbox/event hooks push listing changes to the search index.
- **Observability:** structured logging, request IDs, error tracking.

---

## 4. Database Architecture **[DB-specific]**

- **PostgreSQL** as source of truth via **Prisma**.
- Normalised core entities with FKs and indexes on hot query paths (status, category, location, price, createdAt).
- Money stored as integer **kobo** (₦ × 100) to avoid float errors.
- Soft-delete via `deletedAt` for listings/users; hard-delete only via admin + audit.
- Enums for status fields; `@@index` on `(status, categoryId, state, city)` for browse filters.
- Search engine holds a denormalised projection of approved listings (read path), Postgres stays authoritative.

_(MongoDB variant: same entities as Mongoose models; reference IDs for relations; compound indexes mirroring the Postgres indexes; use transactions for payment+promotion writes.)_

---

## 5. Folder Structure

**Monorepo (recommended): `apps/web`, `apps/api`, `packages/shared` (Zod schemas, types).**

```
ojara/
├─ apps/
│  ├─ web/                      # Next.js
│  │  ├─ app/
│  │  │  ├─ (public)/           # /, search, category, listing, seller, pricing...
│  │  │  ├─ (auth)/             # login, register, reset
│  │  │  ├─ dashboard/          # seller dashboard
│  │  │  └─ admin/              # admin dashboard
│  │  ├─ components/ (ui/, listing/, search/, chat/)
│  │  ├─ lib/ (api-client, auth, seo, hooks)
│  │  └─ styles/
│  └─ api/                      # NestJS or Express
│     ├─ src/
│     │  ├─ modules/
│     │  │  ├─ auth/ users/ sellers/ categories/ listings/
│     │  │  ├─ search/ favorites/ chat/ reports/ moderation/
│     │  │  ├─ payments/ promotions/ subscriptions/ verification/
│     │  │  ├─ notifications/ analytics/ admin/ audit/
│     │  ├─ common/ (guards, interceptors, filters, decorators)
│     │  ├─ jobs/ (queues, workers)
│     │  ├─ config/  prisma/ (schema.prisma, migrations)
│     │  └─ main.ts
└─ packages/
   └─ shared/ (zod schemas, DTO types, constants, enums)
```

---

## 6. API Design

Base: `/api/v1`. Auth via Bearer access token; refresh via httpOnly cookie. Pagination: cursor or `?page&limit`. Standard error envelope `{ error: { code, message, details } }`.

| Method      | Path                                                                                                             | Auth      | Purpose                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------- |
| POST        | `/auth/register`                                                                                                 | —         | Create account                    |
| POST        | `/auth/login`                                                                                                    | —         | Login → tokens                    |
| POST        | `/auth/refresh`                                                                                                  | cookie    | Rotate tokens                     |
| POST        | `/auth/logout`                                                                                                   | ✅        | Revoke session                    |
| POST        | `/auth/forgot-password` / `/reset-password`                                                                      | —         | Reset flow                        |
| GET         | `/me`                                                                                                            | ✅        | Current user                      |
| GET         | `/users/:id` / `/sellers/:id`                                                                                    | —         | Public profile                    |
| GET         | `/categories`                                                                                                    | —         | List categories                   |
| GET         | `/listings`                                                                                                      | —         | Browse (filters, sort)            |
| GET         | `/listings/:slug`                                                                                                | —         | Listing detail                    |
| POST        | `/listings`                                                                                                      | ✅        | Create (→ PENDING)                |
| PATCH       | `/listings/:id`                                                                                                  | owner     | Edit (may re-pend)                |
| DELETE      | `/listings/:id`                                                                                                  | owner     | Soft-delete                       |
| POST        | `/listings/:id/images`                                                                                           | owner     | Upload images                     |
| GET         | `/search`                                                                                                        | —         | Search engine query               |
| POST/DELETE | `/favorites/:listingId`                                                                                          | ✅        | Save/unsave                       |
| POST        | `/listings/:id/contact-reveal`                                                                                   | ✅        | Reveal phone (rate-limited)       |
| GET         | `/chats` / `/chats/:id/messages`                                                                                 | ✅        | Threads/messages                  |
| POST        | `/chats/:id/messages`                                                                                            | ✅        | Send message                      |
| POST        | `/reports`                                                                                                       | ✅        | Report listing                    |
| POST        | `/payments/initiate`                                                                                             | ✅        | Start Paystack (promo/sub/verify) |
| POST        | `/payments/webhook`                                                                                              | signature | Paystack webhook                  |
| GET         | `/promotions/packages`                                                                                           | —         | Promo packages                    |
| GET         | `/subscriptions/plans`                                                                                           | —         | Subscription plans                |
| POST        | `/verification/apply`                                                                                            | ✅        | Submit docs + fee                 |
| **Admin**   | `/admin/listings`, `/admin/users`, `/admin/reports`, `/admin/categories`, `/admin/payments`, `/admin/audit-logs` | admin     | Moderation/ops                    |

---

## 7. Authentication Flow

1. Register → password hashed with **argon2** (or bcrypt cost ≥ 12) → user created (default role `BUYER`).
2. Login → verify → issue **access JWT (15 min)** + **refresh token** stored as rotating, httpOnly, Secure, SameSite=Lax cookie; refresh hash persisted server-side.
3. Access expiry → `POST /auth/refresh` rotates both tokens; **refresh-token reuse detection** revokes the session family.
4. Logout → invalidate refresh token server-side + clear cookie.
5. Password reset → single-use token (30-min TTL) emailed; consumes on use.
6. Optional: email/phone verification flags feed the trust badge.

---

## 8. Authorization / RBAC

- Roles: `GUEST` (no token), `BUYER`, `SELLER`, `ADMIN`, `SUPER_ADMIN`. Stored as a `roles` array on the user.
- Guard pattern: `@Roles('ADMIN')` + `RolesGuard`; resource ownership checks for listings/chats (`ownerId === userId`).
- `SUPER_ADMIN` exclusive: manage admins, platform settings, pricing/feature flags.
- All privileged mutations write an `AuditLog` row (actor, action, target, before/after, ip, ts).
- Principle of least privilege; deny-by-default on admin routes.

---

## 9. Database Models **[DB-specific]**

Core entities (per spec): `User`, `SellerProfile`, `Category`, `Listing`, `ListingImage`, `Favorite`, `Chat`, `Message`, `Report`, `Payment`, `PromotionPackage`, `SubscriptionPlan`, `SellerSubscription`, `Review`, `Notification`, `AuditLog`.

Key relationships:

- `User 1—1 SellerProfile` (created lazily on first listing/verification).
- `User 1—N Listing`; `Listing N—1 Category`; `Listing 1—N ListingImage`.
- `User N—N Listing` via `Favorite`.
- `Chat` binds `(buyerId, sellerId, listingId)`; `Chat 1—N Message`.
- `Report N—1 Listing`, `N—1 reporterId`.
- `Payment` polymorphic by `purpose` (`PROMOTION | SUBSCRIPTION | VERIFICATION | FEATURED`).
- `SellerSubscription N—1 SubscriptionPlan`.

---

## 10. Prisma Schema Planning **[DB-specific]**

```prisma
// Illustrative — not final. Money in kobo (Int). All ids cuid.

enum Role { BUYER SELLER ADMIN SUPER_ADMIN }
enum ListingStatus { PENDING APPROVED REJECTED SUSPENDED EXPIRED SOLD DELETED }
enum Condition { NEW USED FOR_PARTS }
enum VerificationStatus { NONE PENDING VERIFIED REJECTED }
enum PaymentPurpose { PROMOTION SUBSCRIPTION VERIFICATION FEATURED }
enum PaymentStatus { PENDING SUCCESS FAILED ABANDONED }
enum ReportReason { SCAM PROHIBITED DUPLICATE MISCATEGORISED ALREADY_SOLD OTHER }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  phone         String?
  roles         Role[]   @default([BUYER])
  emailVerified Boolean  @default(false)
  phoneVerified Boolean  @default(false)
  avatarUrl     String?
  createdAt     DateTime @default(now())
  deletedAt     DateTime?
  sellerProfile SellerProfile?
  listings      Listing[]
  favorites     Favorite[]
  reports       Report[]
  payments      Payment[]
  notifications Notification[]
}

model SellerProfile {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id])
  bio                String?
  verification       VerificationStatus @default(NONE)
  verifiedAt         DateTime?
  ratingAvg          Float    @default(0)
  ratingCount        Int      @default(0)
  isFeatured         Boolean  @default(false)
  featuredUntil      DateTime?
}

model Category {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  parentId  String?
  parent    Category? @relation("Sub", fields: [parentId], references: [id])
  children  Category[] @relation("Sub")
  order     Int      @default(0)
  listings  Listing[]
}

model Listing {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  description String
  priceKobo   Int
  condition   Condition @default(USED)
  status      ListingStatus @default(PENDING)
  state       String
  city        String          // city/LGA
  area        String?         // local area/market
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  images      ListingImage[]
  isPromoted  Boolean  @default(false)
  promotedUntil DateTime?
  expiresAt   DateTime
  viewsCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  @@index([status, categoryId, state, city])
  @@index([status, isPromoted, createdAt])
}

model ListingImage {
  id        String @id @default(cuid())
  listingId String
  listing   Listing @relation(fields: [listingId], references: [id])
  url       String
  publicId  String   // Cloudinary id for deletion
  isPrimary Boolean @default(false)
  order     Int     @default(0)
}

model Favorite {
  userId    String
  listingId String
  createdAt DateTime @default(now())
  @@id([userId, listingId])
}

model Chat {
  id        String @id @default(cuid())
  listingId String
  buyerId   String
  sellerId  String
  createdAt DateTime @default(now())
  messages  Message[]
  @@unique([listingId, buyerId, sellerId])
}

model Message {
  id        String @id @default(cuid())
  chatId    String
  chat      Chat   @relation(fields: [chatId], references: [id])
  senderId  String
  body      String
  readAt    DateTime?
  createdAt DateTime @default(now())
  @@index([chatId, createdAt])
}

model Report {
  id         String @id @default(cuid())
  listingId  String
  reporterId String
  reason     ReportReason
  details    String?
  resolved   Boolean @default(false)
  createdAt  DateTime @default(now())
  @@unique([listingId, reporterId])
}

model PromotionPackage {
  id        String @id @default(cuid())
  name      String
  days      Int
  priceKobo Int
  active    Boolean @default(true)
}

model SubscriptionPlan {
  id            String @id @default(cuid())
  name          String
  priceKobo     Int
  listingLimit  Int
  promoCredits  Int
  features      Json
  active        Boolean @default(true)
}

model SellerSubscription {
  id        String @id @default(cuid())
  userId    String
  planId    String
  startedAt DateTime @default(now())
  expiresAt DateTime
  active    Boolean @default(true)
}

model Payment {
  id          String @id @default(cuid())
  userId      String
  user        User   @relation(fields: [userId], references: [id])
  purpose     PaymentPurpose
  amountKobo  Int
  status      PaymentStatus @default(PENDING)
  reference   String @unique         // Paystack reference
  targetId    String?               // listingId / planId / verification req id
  metadata    Json?
  createdAt   DateTime @default(now())
}

model Review {
  id        String @id @default(cuid())
  sellerId  String
  authorId  String
  rating    Int
  body      String?
  createdAt DateTime @default(now())
}

model Notification {
  id        String @id @default(cuid())
  userId    String
  user      User   @relation(fields: [userId], references: [id])
  type      String
  payload   Json
  readAt    DateTime?
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String @id @default(cuid())
  actorId   String
  action    String
  targetType String
  targetId  String
  before    Json?
  after     Json?
  ip        String?
  createdAt DateTime @default(now())
}
```

---

## 11. Search Indexing Strategy

- **Meilisearch** (simpler ops) or **Typesense**. Index only **APPROVED, non-expired** listings.
- Indexed doc: `id, title, description, categorySlug, state, city, area, priceKobo, condition, isPromoted, promotedUntil, createdAt, primaryImage`.
- **Searchable:** title, description, category, location. **Filterable:** category, state, city, area, price, condition, isPromoted. **Sortable:** createdAt, priceKobo.
- **Ranking:** relevance → promotion boost → recency. Promoted listings get a bounded ranking lift (not absolute top to avoid spam perception).
- **Sync:** on listing approve/edit/expire/delete/promote, enqueue a BullMQ job to upsert/remove the doc (outbox pattern to avoid drift). Nightly full reconcile.
- Fallback: if search is down, public browse falls back to Postgres queries (degraded relevance).

---

## 12. Image Upload Strategy

- **Cloudinary** (recommended; transformations + CDN) or **S3 + CloudFront**.
- **Signed direct uploads** from client (browser → Cloudinary) using a server-issued signature; API stores returned `url` + `publicId`.
- Client-side compression/resize before upload (target ≤ 300–500KB, max 1600px).
- Server validates count (e.g., 1–8), MIME (jpeg/png/webp), and dimensions; rejects others.
- Generate responsive transformations (thumb/card/detail) via Cloudinary URL params.
- Deleting a listing/image removes the Cloudinary asset via `publicId` (async job).
- Optional later: moderation API for NSFW detection.

---

## 13. Payment Strategy (Paystack)

- Server-driven init: `POST /payments/initiate` creates a `Payment(PENDING)` with a unique `reference`, calls Paystack initialize, returns the authorization URL/inline params.
- Client completes payment via Paystack (inline popup or redirect).
- **Never trust the client callback for fulfilment** — fulfilment happens only on verified webhook (and/or server-side `verify`).
- Amounts in **kobo**; currency NGN. Idempotency keyed on `reference`.
- Purposes: `PROMOTION` (sets `promotedUntil`), `SUBSCRIPTION` (creates/extends `SellerSubscription`), `VERIFICATION` (advances verification), `FEATURED` (sets `featuredUntil`).

---

## 14. Webhook Handling

- Endpoint `POST /payments/webhook` (raw body), verify Paystack signature (`x-paystack-signature`, HMAC-SHA512 of body with secret key). Reject if invalid.
- Look up `Payment` by `reference`; ensure **idempotency** (ignore if already `SUCCESS`).
- On `charge.success`: mark `SUCCESS`, run the purpose-specific fulfilment inside a DB transaction, emit notification + email, write audit log.
- On failure/abandon: mark accordingly; no fulfilment.
- Return 200 fast; do heavy work async via BullMQ. Reconciliation job re-verifies `PENDING` payments older than N minutes against Paystack `verify` API to catch missed webhooks.

---

## 15. Promotion Expiry Logic

- On successful promo payment: `isPromoted = true`, `promotedUntil = now + package.days`.
- A recurring **BullMQ repeatable job** (e.g., every 10 min) finds listings where `isPromoted && promotedUntil < now`, sets `isPromoted = false`, clears boost, and re-indexes search.
- Same pattern for `SellerProfile.featuredUntil` and `SellerSubscription.expiresAt`.
- **Listing expiry:** job marks `APPROVED` listings past `expiresAt` as `EXPIRED`, removes from search; seller can renew (resets `expiresAt`, may re-enter PENDING per policy).

---

## 16. Realtime Chat Architecture

- **Socket.IO** with **Redis adapter** for horizontal scaling.
- Auth on connect via access token; join rooms keyed by `chatId`.
- Message flow: client emits → server validates membership + persists `Message` → broadcasts to room → updates unread counts → triggers notification (in-app + email if offline).
- Per-listing thread uniqueness `(listingId, buyerId, sellerId)`.
- Typing indicators and read receipts optional in v1.
- Abuse controls: rate-limit messages/min; block/report from chat.

---

## 17. Notification System

- Channels: **in-app** (`Notification` table + socket push) and **email** (Resend/Nodemailer).
- Triggers: new message, listing approved/rejected, listing expiring/expired, payment success, verification result, report resolved.
- Delivery via BullMQ workers; templated emails; per-user preferences (later).
- WhatsApp/SMS deferred to future.

---

## 18. Admin Moderation Workflow

1. New/edited listing → `PENDING` → enters moderation queue.
2. Moderator reviews against approval rules → **Approve / Reject (reason) / Request changes / Suspend / Flag / Delete**.
3. Approve → index in search, set `expiresAt`, notify seller.
4. Reject/suspend → notify with reason; record strike if policy-violating.
5. Reports queue groups by listing; bulk actions; resolving a report can trigger listing action.
6. Every action → `AuditLog`. Repeat offenders → suspension → ban.

---

## 19. Security Requirements

- HTTPS everywhere; HSTS. Secrets via env/secret manager, never in repo.
- Passwords argon2/bcrypt; JWT access short-lived; refresh rotating + reuse detection; httpOnly Secure cookies.
- RBAC deny-by-default; ownership checks on all resource mutations.
- Input validation (Zod) + output encoding; parameterised queries (Prisma) → no SQLi.
- CORS allow-list; CSRF protection for cookie-based refresh.
- Helmet headers, CSP on web app.
- Webhook signature verification; idempotency keys.
- Rate limiting on auth, contact-reveal, reports, messaging, payment init.
- PII (verification docs) encrypted at rest, access-logged, retention policy (NDPR/NDPA).
- Dependency scanning + Dependabot; least-privilege service accounts.

---

## 20. Rate Limiting

- Redis-backed (sliding window). Examples: login 5/min/IP, register 3/min/IP, contact-reveal 20/hour/user, reports 10/day/user, messages 30/min/user, payment-init 10/hour/user, search 60/min/IP.
- Global per-IP ceiling on the API gateway; stricter on auth endpoints; CAPTCHA on register/login after threshold.

---

## 21. Input Validation

- Single source of truth: **Zod schemas in `packages/shared`**, reused on web (RHF) and API.
- Validate types, lengths, enums, price ranges, location against known states/LGAs, category existence.
- Reject unknown fields; sanitise rich text/description (strip scripts, contact-stuffing patterns flagged).

---

## 22. File Validation

- MIME + magic-byte check (not just extension); allow jpeg/png/webp.
- Max size per image (≤ 5MB pre-compression), max count per listing (1–8).
- Max dimensions enforced; strip EXIF/GPS metadata on upload.
- Verification docs: pdf/jpeg/png only, size cap, stored in a private bucket, signed access.

---

## 23. Performance Requirements

- Public pages SSR/ISR; p75 mobile **LCP < 2.5s**, CLS < 0.1, INP < 200ms.
- Search p95 **< 300ms**; listing detail TTFB < 400ms (cached).
- Image CDN + responsive sizes; lazy-load below the fold.
- Cache: ISR for category/location pages; Redis cache for hot reads (categories, packages); HTTP caching headers.
- Minimal client JS on browse/search; defer non-critical scripts.
- DB: indexes on filter paths; pagination (avoid offset on large sets — use keyset where possible).

---

## 24. SEO Technical Implementation

- SSR/ISR for `/`, `/category/[slug]`, location landing pages, `/listing/[slug]`, `/seller/[id]`.
- Unique `<title>`/meta/H1 per page; canonical tags; OG/Twitter cards.
- **JSON-LD:** `Product` + `Offer` (price NGN, availability), `BreadcrumbList`, `Organization`.
- Dynamic sitemaps split by category/location, regenerated on publish/expiry; `robots.txt`.
- Clean slugs (`/listing/lagos-iphone-13-pro-ab12cd`), 301s on slug change, 404/410 for expired.
- Pagination via canonical + `rel` handling; avoid thin/duplicate pages (noindex empty filters).
- Internal linking: category ↔ location ↔ related listings.

---

## 25. Deployment Plan

| Component            | Host                                    |
| -------------------- | --------------------------------------- |
| Web (Next.js)        | **Vercel**                              |
| API (NestJS/Express) | **Render / Railway / Fly.io**           |
| PostgreSQL           | **Neon / Supabase / Railway**           |
| Redis                | **Upstash**                             |
| Search               | Meilisearch Cloud / self-host on Fly.io |
| Images               | Cloudinary (or S3 + CloudFront)         |
| Email                | Resend                                  |

- Environments: `dev`, `staging`, `prod`. CI/CD (GitHub Actions): lint → test → build → migrate (`prisma migrate deploy`) → deploy.
- DB migrations gated and run on deploy; rollbacks documented.
- Workers (BullMQ) deployed as a separate process/service from the API.

---

## 26. Environment Variables

```
# Core
NODE_ENV, PORT, API_BASE_URL, WEB_BASE_URL
# Auth
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TTL, REFRESH_TTL, COOKIE_DOMAIN
# Database / cache
DATABASE_URL, REDIS_URL
# Search
SEARCH_HOST, SEARCH_API_KEY
# Images
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# Payments
PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, PAYSTACK_WEBHOOK_SECRET
# Email
RESEND_API_KEY, EMAIL_FROM
# Misc
SENTRY_DSN, RATE_LIMIT_REDIS_PREFIX
```

> Never commit. Use platform secret stores. Separate keys per environment; Paystack test keys in dev/staging.

---

## 27. Logging & Monitoring

- Structured JSON logs (pino) with request IDs; correlate API ↔ worker.
- Error tracking (Sentry) on web + API + workers.
- Metrics: request latency, error rate, queue depth, job failures, webhook success rate, search latency.
- Uptime checks on API/search/payments webhook; alerting on webhook failures and queue backlog.
- Audit log (immutable) for all privileged actions.

---

## 28. Backup Strategy

- Postgres: automated daily backups + PITR (provider feature) ; periodic restore drills.
- Cloudinary/S3: versioning + lifecycle; source images are the asset of record.
- Search index is **rebuildable** from Postgres (no backup needed; keep reindex script).
- Redis is ephemeral (queues persisted via provider where supported; jobs idempotent).
- Document RPO/RTO targets; store secrets backup in a vault.

---

## 29. Scalability Plan

- Stateless API → horizontal scale behind LB; sticky-free thanks to JWT + Redis.
- Socket.IO scales via Redis adapter; separate WS nodes if needed.
- Read-heavy browse/search offloaded to the search engine + ISR/CDN.
- DB: connection pooling (PgBouncer/Neon pooler); add read replicas if read load grows; partition large tables (messages, audit) later.
- Workers scale independently by queue.
- Start as modular monolith; extract services (search-sync, payments, chat) only if a clear bottleneck emerges.

---

## 30. Summary (technical)

**Build first:** repo/monorepo, env config, Prisma schema + migrations, auth + RBAC, then listings/images/categories + admin moderation. **Delay:** search tuning, chat scaling, monetisation, analytics until supply exists. **Confirm:** the **Postgres vs MongoDB/MERN** decision (§0) before writing the schema — it's the only thing that gates the data layer. **Safest order:** schema → auth → listings+moderation → search → chat → trust/verification → payments → analytics/launch.
