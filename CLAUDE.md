# CLAUDE.md — Lumo

> **Lumo** — _the trusted local marketplace for verified Nigerian sellers._
> A Nigerian classified ads marketplace (Jiji-style) with stronger trust, verification, search, moderation, and SEO.
> **This is classifieds, NOT e-commerce.** There is **no buyer checkout**. We connect buyers↔sellers and monetise visibility & trust only.

This file is your persistent context. Read it every session. The detailed spec lives in `/docs` — consult it, don't re-derive it.

---

## Source of truth (read before building anything non-trivial)

- `docs/PRD.md` — product: features, roles, rules, monetisation, acceptance criteria.
- `docs/TRD.md` — technical: architecture, schema, API, security, infra.
- `docs/APP_FLOW.md` — every user/system flow step by step.

If a request conflicts with these docs, flag it before proceeding.

---

## Tech stack (definitive — do not substitute without asking)

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · React Hook Form · Zod
- **Backend:** Node.js · Express · REST (`/api/v1`) · JWT (access + rotating refresh) · RBAC
- **Database:** PostgreSQL · Prisma ORM
- **Search:** Meilisearch
- **Images:** Cloudinary (signed direct uploads)
- **Payments:** Paystack (webhook-fulfilled)
- **Realtime:** Socket.IO (Redis adapter)
- **Email:** Resend
- **Jobs/cache/rate-limit:** Redis + BullMQ
- **Shared validation:** Zod schemas in `packages/shared`, reused on web + api

---

## Repo structure (pnpm workspaces monorepo)

```
Lumo/
├─ apps/web/        # Next.js (public pages SSR/ISR, dashboards client-side)
├─ apps/api/        # Express API + BullMQ workers
│  └─ prisma/       # schema.prisma + migrations
├─ packages/shared/ # Zod schemas, types, enums, constants
└─ docs/            # PRD, TRD, APP_FLOW
```

## Commands

```
pnpm install                      # install all workspaces
pnpm --filter web dev             # run Next.js
pnpm --filter api dev             # run Express API
pnpm --filter api prisma:migrate  # prisma migrate dev
pnpm --filter api prisma:generate # generate client
pnpm --filter api worker          # run BullMQ workers
pnpm lint && pnpm typecheck       # before every commit
```

(npm workspaces is fine too if you prefer — adjust commands.)

---

## Coding conventions (must follow)

- **TypeScript strict everywhere.** No `any` without a comment justifying it.
- **Money is stored as integer kobo** (₦ × 100). Never floats for money.
- **Validation:** define Zod schemas once in `packages/shared`; import on both web and api. Validate at every boundary.
- **IDs:** cuid. **Slugs:** `lagos-iphone-13-pro-ab12cd` (city-title-shortid).
- **Enums** match the Prisma schema (ListingStatus, Role, PaymentPurpose, etc.). Don't invent parallel string unions.
- **API errors:** envelope `{ error: { code, message, details } }`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`). Commit after each working milestone.
- **No secrets in code.** Use `.env` (see TRD §26 for the full var list).

---

## Domain rules (non-negotiable — encode these in logic, not just UI)

1. Browsing/search is **open**. Posting, saving, chatting, reporting, promoting all **require login**.
2. New **and edited** listings start `PENDING` and are invisible publicly until admin `APPROVED`.
3. Admin actions: approve / reject(reason) / request-changes / suspend / flag / delete — each writes an `AuditLog`.
4. Listings auto-**expire** at `expiresAt` (TTL ~30d) → `EXPIRED`, removed from search, renewable.
5. Promotions set `promotedUntil`; a repeatable job **auto-reverts** to normal on expiry. Same for `featuredUntil` and subscriptions.
6. **Payments are fulfilled ONLY on a verified Paystack webhook** — never trust the client callback. Idempotent on `reference`.
7. Search index holds **only APPROVED, non-expired** listings; Postgres is the source of truth, search is the read path.
8. Contact (phone) is revealed only to logged-in users and is rate-limited.

---

## Security must-dos

- Argon2/bcrypt(≥12) passwords · short access JWT (15m) · rotating refresh in httpOnly Secure cookie · refresh-reuse detection.
- RBAC deny-by-default + resource **ownership checks** on every mutation.
- Verify Paystack webhook signature (HMAC-SHA512). Rate-limit auth, contact-reveal, reports, messaging, payment-init.
- File uploads: MIME + magic-byte check, size/count/dimension limits, strip EXIF. Verification docs in a **private** bucket.

---

## How to work with me (IMPORTANT — read this)

This is a large build and I have hit output-token limits before. Work **incrementally and scoped**:

- **Build ONE phase at a time.** Never attempt multiple phases in a single response.
- Within a phase, work in **small verifiable units**. After each unit, summarise what changed and pause if nearing a limit — I'll say "continue."
- Make **targeted edits** to a few files at a time. Don't dump or re-print the entire codebase.
- When a task is big, first propose a short **checklist**, then execute items sequentially across turns.
- After finishing a phase's deliverables: **STOP**, list what was built, give the run/verify steps, and wait for "proceed to Phase N+1." Do not roll into the next phase unprompted.
- **Ask before** adding any dependency or deviating from the stack/docs above.
- Prefer working code that runs over breadth. Each phase should end in a runnable state.

---

## Phase roadmap (gate each behind its acceptance criteria in PRD §21)

- **Phase 0 — Foundations:** monorepo, env config, Prisma schema + first migration, Express skeleton, Next.js skeleton, auth (register/login/refresh/logout) + RBAC, health check. ← **START HERE**
- **Phase 1 — Listings core:** categories, listing CRUD + Cloudinary images, admin moderation queue (approve/reject/suspend), expiry job.
- **Phase 2 — Discovery:** Meilisearch indexing + sync, search/filters, favorites, SEO pages (SSR/ISR, JSON-LD, sitemap).
- **Phase 3 — Connection:** contact-reveal, Socket.IO chat, notifications (in-app + email).
- **Phase 4 — Trust:** reports + moderation actions, seller verification flow.
- **Phase 5 — Monetisation:** Paystack init + webhook, promotions, subscriptions, featured stores.
- **Phase 6 — Hardening:** analytics, performance, polish, launch.

## Current state

- Phase: **1 complete (Listings core).** Categories (public + admin CRUD + seed), listing CRUD (PENDING-on-create/edit, browse/detail/filters, soft-delete, mark-sold), Cloudinary signed image uploads, admin moderation (approve/reject/suspend/request-changes/flag/delete + AuditLog + Notifications), BullMQ expiry worker (Upstash). Phase 0: monorepo, auth + RBAC, Express skeleton, Next.js skeleton.
- Infra: Supabase Postgres · Cloudinary images · Upstash Redis (BullMQ). Worker: `pnpm --filter @lumo/api worker`.
- Next: **Phase 2 — Discovery** (Meilisearch, search/filters, favorites, SEO) — awaiting "proceed to Phase 2".
- Update this line as phases complete so I always know where we are.
