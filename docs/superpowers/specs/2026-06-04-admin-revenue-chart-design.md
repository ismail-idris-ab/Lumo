# Admin Revenue-Over-Time Chart — Design

**Date:** 2026-06-04
**Status:** Approved (design); pending implementation plan
**Scope:** Add a daily revenue trend chart to the admin dashboard. Admin-only. No new
dependency, no schema migration. Existing point-in-time analytics totals are unchanged.

---

## 1. Goal & context

The admin overview currently shows point-in-time totals (users, listings-by-status, pending
moderation, unresolved reports, pending verifications, revenue all-time + 30d). It has **no
trend view** — the operator can't see whether revenue is rising or falling.

This feature adds one chart: **revenue per day, range-selectable over 7 / 30 / 90 days.**

Constraint that shaped the design: most metrics could be charted (payments, signups, listings,
chats, contact-reveals, favorites all carry `createdAt`), but **listing views cannot** —
`viewsCount` is a running counter with no per-event timestamps. Revenue was chosen as the single
headline metric for v1; views are explicitly out of scope.

---

## 2. API

### Endpoint
```
GET /api/v1/admin/analytics/revenue?days=30
```
- Mounted on the existing admin router, behind the same RBAC guard as the current admin
  analytics endpoint (admin / super-admin only).
- `days` ∈ `{7, 30, 90}`. Omitted → defaults to `30`. Any other value → `400` error envelope.

### Response
Always returns exactly `days` points, oldest → newest, zero-filled so the chart has no gaps:
```json
{
  "days": 30,
  "series": [
    { "date": "2026-05-06", "totalKobo": 150000, "count": 2 },
    { "date": "2026-05-07", "totalKobo": 0, "count": 0 }
  ]
}
```
- `date`: `YYYY-MM-DD` in **Africa/Lagos (WAT, UTC+1, no DST)**.
- `totalKobo`: sum of `amountKobo` for `SUCCESS` payments in that WAT day (integer kobo).
- `count`: number of `SUCCESS` payments that day (shown in the tooltip as extra signal).

### Computation
- `getRevenueSeries(days)` in `analytics.service.ts`:
  1. Fetch `SUCCESS` payments with `createdAt >= windowStart` selecting `createdAt, amountKobo`.
  2. Delegate to a **pure helper** `bucketRevenueByDay(payments, days, now)` that produces the
     zero-filled WAT-day series.
- **Day boundary = Africa/Lagos.** A fixed +1h offset (no DST) is applied before taking the
  date, so "per day" matches the operator's local day rather than UTC.
- **Approach choice:** JS bucketing over raw SQL `date_trunc`. Rationale: early-stage payment
  volume over ≤90 days is small; the pure helper is unit-testable with no DB, matching the
  existing test suite. Raw SQL is the documented future optimisation if volume grows.

### Validation & types (`packages/shared`)
- `adminRevenueQuerySchema` — Zod schema validating/coercing `days` (default 30, enum 7/30/90).
- `RevenuePoint = { date: string; totalKobo: number; count: number }`.
- `RevenueSeries = { days: number; series: RevenuePoint[] }`.
- Imported on both web and api (single source of truth; avoids `amountKobo`/`totalKobo` drift).

---

## 3. Web UI

On `apps/web/app/admin/page.tsx` (already client-side — no SSR/SEO concern), add a **Revenue**
card below the existing totals, reusing `components/stat-card.tsx` styling for the wrapper so it
matches the current overview.

### Component: `apps/web/components/revenue-chart.tsx` (kebab-case per repo convention; export `RevenueChart`)
- **Range toggle:** `7 / 30 / 90` buttons, default `30`, as a labelled button group.
- **Fetch:** `GET /admin/analytics/revenue?days=N` via the existing authed API client, on mount
  and whenever the range changes. `days` restricted to `7 | 30 | 90`.
- **Race safety:** guard against stale responses on fast toggling (e.g. an incrementing request
  id / AbortController; only the latest response updates state).
- **Render (hand-rolled SVG, no deps, Tailwind):**
  - One bar per day; bar height scaled against the max `totalKobo` in the selected range.
  - Baseline axis, y-max label, date-range caption.
  - Hover tooltip: date + `₦` amount (kobo→naira via `toLocaleString('en-NG')`) + `· N payments`.
- **Formatting helpers:** small, local — kobo→₦ and date-label.
- **Accessibility:** chart wrapper `role="img"` with an `aria-label` summarising the series
  (range + total); toggle is a labelled button group.

### States
- **Loading:** skeleton.
- **Error:** inline "Couldn't load revenue" + retry button.
- **Empty / all-zero:** flat baseline with "No revenue yet".

---

## 4. Testing

**Unit test — `bucketRevenueByDay` (pure, DB-free, fits existing suite):**
- Zero-fill: exactly `days` points with no payments (all `totalKobo:0, count:0`).
- Correct day assignment + summing of multiple payments on the same day.
- **WAT boundary:** a payment at `2026-06-04T23:30:00Z` (00:30 WAT next day) lands in the WAT
  day, not the UTC day.
- Range edges: payment exactly at window start included; one just before excluded.
- Ordering: series ascending by date.

**Error / edge handling:**
- API: invalid `days` (`15`, non-numeric) → Zod `400` envelope; omitted → defaults to 30.
- API: no payments → valid all-zero `200` series (not an error).
- Web: fetch failure → inline error + retry; all-zero → "No revenue yet"; stale-response guard
  on fast toggle.

**Explicitly not tested** (consistent with the current suite): the SVG render (no DOM/component
tests in the repo) and route RBAC (covered generically by `rbac.test.ts`).

---

## 5. Units & boundaries

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `bucketRevenueByDay` (pure) | payments → zero-filled WAT-day series | nothing (pure) |
| `getRevenueSeries` (service) | fetch SUCCESS payments + delegate to bucketer | prisma, bucketer |
| revenue route handler | RBAC + validate `days` + return series | admin router, shared schema, service |
| shared schema/types | validate `days`, define `RevenuePoint`/`RevenueSeries` | zod |
| `RevenueChart` (web) | fetch + range toggle + SVG render + states | api client, shared types |

## 6. Out of scope (YAGNI)
- Views-over-time (no event table), signups/listings/leads time-series, monthly/yearly ranges,
  CSV export, seller-facing time-series, charting library, raw-SQL aggregation.
