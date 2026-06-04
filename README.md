# Lumo

> The trusted local marketplace for verified Nigerian sellers.

A Nigerian classified-ads marketplace (Jiji-style) with stronger trust, verification,
search, moderation, and SEO. **Classifieds, not e-commerce** — there is no buyer
checkout; Lumo connects buyers ↔ sellers and monetises visibility & trust only.

Product spec: [`docs/PRD.md`](docs/PRD.md) · Technical spec: [`docs/TRD.md`](docs/TRD.md) ·
Flows: [`docs/APP_FLOW.md`](docs/APP_FLOW.md).

---

## Stack

| Layer        | Tech                                                            |
| ------------ | --------------------------------------------------------------- |
| Frontend     | Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · RHF · Zod |
| Backend      | Node · Express · REST `/api/v1` · JWT (access + rotating refresh) · RBAC |
| Database     | PostgreSQL · Prisma                                             |
| Search       | Meilisearch (Postgres is source of truth)                      |
| Images       | Cloudinary (signed direct uploads)                             |
| Payments     | Paystack (webhook-fulfilled)                                   |
| Realtime     | Socket.IO                                                      |
| Email        | Resend                                                         |
| Jobs/cache   | Redis + BullMQ                                                 |

## Repo layout (pnpm workspaces)

```
apps/web/        Next.js — public pages SSR/ISR, dashboards client-side
apps/api/        Express API + BullMQ workers (+ prisma/)
packages/shared/ Zod schemas, types, enums, constants — reused on web + api
docs/            PRD, TRD, APP_FLOW
```

---

## Local development

**Prerequisites:** Node ≥ 22, pnpm 11, and reachable Postgres + Redis (local or hosted).

```bash
pnpm install                         # all workspaces
cp .env.example .env                 # fill in values (see below)
pnpm --filter @lumo/shared build     # compile shared (api/web resolve its dist)
pnpm --filter @lumo/api prisma:generate
pnpm --filter @lumo/api prisma:migrate   # apply migrations (dev)
pnpm --filter @lumo/api seed             # categories, promo packages, sub plans
pnpm --filter @lumo/api search:setup     # create Meili index + settings (if using search)

# run (separate terminals, or `pnpm dev` for all in parallel)
pnpm --filter @lumo/api dev          # API  → http://localhost:4000
pnpm --filter @lumo/api worker:dev   # BullMQ worker (expiry, reconcile, search sync)
pnpm --filter @lumo/web dev          # web  → http://localhost:3000
```

**Promote an admin** (register the user via the UI first):

```bash
pnpm --filter @lumo/api make-admin you@example.com SUPER_ADMIN
```

### Quality gates (run before every commit — CI enforces these)

```bash
pnpm lint
pnpm typecheck
pnpm --filter @lumo/api test
pnpm -r build
```

Env vars are documented inline in [`.env.example`](.env.example). Money is integer **kobo**
(₦ × 100) — never floats.

---

## Deployment

Three deployable units, all from this monorepo on the `main` branch:

| Unit            | Host             | Defined in                              |
| --------------- | ---------------- | --------------------------------------- |
| Web (Next.js)   | Vercel           | [`apps/web/vercel.json`](apps/web/vercel.json) |
| API (Express)   | Render web svc   | [`render.yaml`](render.yaml)            |
| Worker (BullMQ) | Render bg worker | [`render.yaml`](render.yaml)            |

Postgres = Supabase · Redis = Upstash · Search = Meilisearch Cloud · Images = Cloudinary ·
Email = Resend. Cron is **not** a separate service — expiry sweep, payment reconcile, and
search reindex run inside the worker via BullMQ repeatable schedulers
([`apps/api/src/jobs/main.ts`](apps/api/src/jobs/main.ts)).

### API + worker (Render)

1. New → **Blueprint**, point at this repo. Render reads `render.yaml` and creates
   `lumo-api`, `lumo-worker`, and the `lumo-shared` env group.
2. Fill every `sync: false` secret in the `lumo-shared` group (Supabase
   `DATABASE_URL`/`DIRECT_URL`, Upstash `REDIS_URL`, Meili, Cloudinary, Paystack **live**
   keys, Resend, Sentry) plus the public URLs: `API_BASE_URL`, `WEB_BASE_URL`,
   `COOKIE_DOMAIN` (`.lumo.ng` so api + web share the refresh cookie), `CORS_ALLOWED_ORIGINS`.
   JWT secrets auto-generate.
3. Deploy. `preDeployCommand` runs `prisma migrate deploy` before each release goes live.
4. First deploy only — seed reference data and create an admin via the Render shell:
   ```bash
   pnpm --filter @lumo/api seed
   pnpm --filter @lumo/api search:setup
   pnpm --filter @lumo/api make-admin you@lumo.ng SUPER_ADMIN
   ```

### Web (Vercel)

1. Import the repo. Set **Root Directory = `apps/web`** (keep "include files outside root" on).
2. `vercel.json` handles the build (`@lumo/shared` → `@lumo/web`), region, and install.
3. Set env: `NEXT_PUBLIC_API_BASE_URL=https://<api-domain>/api/v1`,
   `NEXT_PUBLIC_WEB_BASE_URL=https://lumo.ng`, `SENTRY_DSN` (server) +
   `NEXT_PUBLIC_SENTRY_DSN` (browser).
4. (Optional) Readable prod stack traces: set `SENTRY_ORG`, `SENTRY_PROJECT`, and
   `SENTRY_AUTH_TOKEN` (build-time) so the build uploads source maps to Sentry. Skipped
   automatically when any are unset.

### Go-live checklist

- [ ] All Render `sync: false` secrets set with **live** (not test) values.
- [ ] Vercel `NEXT_PUBLIC_*` point at the prod API + site URL.
- [ ] DNS: `lumo.ng` → Vercel, `api.lumo.ng` → Render.
- [ ] `CORS_ALLOWED_ORIGINS` lists every prod web origin; `COOKIE_DOMAIN` is the shared parent.
- [ ] Paystack dashboard webhook → `https://api.lumo.ng/api/v1/payments/webhook` (live mode).
- [ ] Health: `GET https://api.lumo.ng/api/v1/health` returns ok.
- [ ] Seed + admin created; Meili index built (`search:setup`).
- [ ] Smoke test: register → post listing → admin approve → appears in search → initiate a
      payment → webhook fulfils (promotion/verification reflects).

### Operational scripts (`apps/api`)

| Command                                    | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `pnpm --filter @lumo/api prisma:deploy`    | Apply migrations in prod                 |
| `pnpm --filter @lumo/api seed`             | Seed categories / promo packages / plans |
| `pnpm --filter @lumo/api make-admin <email> [ADMIN\|SUPER_ADMIN]` | Promote a user      |
| `pnpm --filter @lumo/api search:setup`     | Create Meili index + settings            |
| `pnpm --filter @lumo/api search:reindex`   | Rebuild the search index from Postgres   |
| `pnpm --filter @lumo/api expiry:run`       | Run the listing-expiry sweep once        |
| `pnpm --filter @lumo/api payments:reconcile` | Re-verify stale PENDING payments once  |

---

## Domain rules (non-negotiable)

Browsing is open; posting/saving/chatting/reporting/promoting require login. New and edited
listings start `PENDING` and are invisible until admin-approved. Listings auto-expire (~30d).
Payments are fulfilled **only** on a verified Paystack webhook (HMAC-SHA512, idempotent on
reference). The search index holds only `APPROVED`, non-expired listings. See
[`CLAUDE.md`](CLAUDE.md) and the docs for the full set.
