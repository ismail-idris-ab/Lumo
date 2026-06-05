# Admin Revenue-Over-Time Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a range-selectable (7/30/90-day) daily revenue trend chart to the admin dashboard.

**Architecture:** A new admin-guarded endpoint `GET /api/v1/admin/analytics/revenue?days=N` returns a zero-filled daily series, computed by a pure `bucketRevenueByDay` helper (Africa/Lagos day boundaries). A hand-rolled SVG React component on the existing admin page fetches it via react-query (keyed on `days`, so fast toggling never shows stale data).

**Tech Stack:** Express + Prisma (api), Zod in `packages/shared`, Next.js + react-query + Tailwind + raw SVG (web), Vitest.

Spec: `docs/superpowers/specs/2026-06-04-admin-revenue-chart-design.md`

---

## File structure

| File | Responsibility | Create/Modify |
| --- | --- | --- |
| `packages/shared/src/schemas/analytics.ts` | `adminRevenueQuerySchema` + `RevenuePoint`/`RevenueSeries` types | Create |
| `packages/shared/src/index.ts` | export the new schema module | Modify |
| `apps/api/src/services/analytics.service.ts` | `bucketRevenueByDay` (pure) + `getRevenueSeries` | Modify |
| `apps/api/src/services/analytics.service.test.ts` | unit tests for `bucketRevenueByDay` | Create |
| `apps/api/src/routes/admin/analytics.ts` | add `/revenue` route | Modify |
| `apps/web/components/revenue-chart.tsx` | fetch + range toggle + SVG render + states | Create |
| `apps/web/app/admin/page.tsx` | mount the Revenue card | Modify |

---

## Task 1: Shared schema + types

**Files:**
- Create: `packages/shared/src/schemas/analytics.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create the schema + types**

Create `packages/shared/src/schemas/analytics.ts`:

```ts
import { z } from 'zod';

// Admin revenue chart range. Omitted → 30. Present-but-invalid (e.g. 15, "abc") → ZodError → 400.
export const adminRevenueQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((n) => [7, 30, 90].includes(n), { message: 'days must be 7, 30, or 90' })
    .default(30),
});
export type AdminRevenueQuery = z.infer<typeof adminRevenueQuerySchema>;

// One day's bucketed revenue. Money is integer kobo (₦ × 100).
export interface RevenuePoint {
  date: string; // YYYY-MM-DD, Africa/Lagos (WAT) calendar day
  totalKobo: number;
  count: number; // number of SUCCESS payments that day
}

export interface RevenueSeries {
  days: number;
  series: RevenuePoint[]; // ascending by date, zero-filled, length === days
}
```

- [ ] **Step 2: Export it from the shared index**

In `packages/shared/src/index.ts`, add after the existing `export * from './schemas/payment';` line:

```ts
export * from './schemas/analytics';
```

- [ ] **Step 3: Build shared so api/web resolve the new types**

Run: `pnpm --filter @lumo/shared build`
Expected: exits 0, `packages/shared/dist/schemas/analytics.js` + `.d.ts` emitted.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/analytics.ts packages/shared/src/index.ts
git commit -m "feat(shared): admin revenue series schema + types"
```

---

## Task 2: Pure bucketing helper (TDD)

**Files:**
- Modify: `apps/api/src/services/analytics.service.ts`
- Test: `apps/api/src/services/analytics.service.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/services/analytics.service.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bucketRevenueByDay } from './analytics.service';

// Fixed "now": 2026-06-10T12:00:00Z → WAT day 2026-06-10.
const NOW = new Date('2026-06-10T12:00:00Z');

describe('bucketRevenueByDay', () => {
  it('zero-fills to exactly `days` ascending points when there are no payments', () => {
    const series = bucketRevenueByDay([], 7, NOW);
    expect(series).toHaveLength(7);
    expect(series[0].date).toBe('2026-06-04'); // 6 days before today (WAT)
    expect(series[6].date).toBe('2026-06-10'); // today (WAT)
    expect(series.every((p) => p.totalKobo === 0 && p.count === 0)).toBe(true);
    // ascending
    expect([...series].sort((a, b) => a.date.localeCompare(b.date))).toEqual(series);
  });

  it('sums amount + count for multiple payments on the same day', () => {
    const series = bucketRevenueByDay(
      [
        { createdAt: new Date('2026-06-10T08:00:00Z'), amountKobo: 50000 },
        { createdAt: new Date('2026-06-10T09:00:00Z'), amountKobo: 25000 },
      ],
      7,
      NOW,
    );
    const today = series.find((p) => p.date === '2026-06-10')!;
    expect(today.totalKobo).toBe(75000);
    expect(today.count).toBe(2);
  });

  it('buckets by the Africa/Lagos (WAT) day, not the UTC day', () => {
    // 2026-06-04T23:30Z is 00:30 on 2026-06-05 in WAT → belongs to the 05th.
    const series = bucketRevenueByDay(
      [{ createdAt: new Date('2026-06-04T23:30:00Z'), amountKobo: 10000 }],
      7,
      NOW,
    );
    expect(series.find((p) => p.date === '2026-06-05')!.totalKobo).toBe(10000);
    expect(series.find((p) => p.date === '2026-06-04')!.totalKobo).toBe(0);
  });

  it('includes a payment on the window-start day and excludes one before the window', () => {
    const series = bucketRevenueByDay(
      [
        { createdAt: new Date('2026-06-04T10:00:00Z'), amountKobo: 1000 }, // window start day
        { createdAt: new Date('2026-06-03T10:00:00Z'), amountKobo: 9999 }, // before window
      ],
      7,
      NOW,
    );
    expect(series.find((p) => p.date === '2026-06-04')!.totalKobo).toBe(1000);
    expect(series.some((p) => p.date === '2026-06-03')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @lumo/api exec vitest run src/services/analytics.service.test.ts`
Expected: FAIL — `bucketRevenueByDay` is not exported.

- [ ] **Step 3: Implement the helper**

In `apps/api/src/services/analytics.service.ts`, add the import to the existing top imports:

```ts
import type { ListingStatus, RevenuePoint, RevenueSeries } from '@lumo/shared';
```

(Replace the current `import type { ListingStatus } from '@lumo/shared';` line with the line above.)

Then add at the end of the file:

```ts
// Africa/Lagos is UTC+1 year-round (no DST). Shift then read the UTC calendar date to get
// the WAT day. Pure + deterministic — `now` is injected so it is unit-testable.
const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 86_400_000;

function watDayKey(d: Date): string {
  return new Date(d.getTime() + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

export interface RevenueInput {
  createdAt: Date;
  amountKobo: number;
}

// Bucket SUCCESS payments into a zero-filled, ascending series of `days` WAT days ending today.
export function bucketRevenueByDay(
  payments: RevenueInput[],
  days: number,
  now: Date,
): RevenuePoint[] {
  const series: RevenuePoint[] = [];
  const index = new Map<string, RevenuePoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() + WAT_OFFSET_MS - i * DAY_MS).toISOString().slice(0, 10);
    const point: RevenuePoint = { date, totalKobo: 0, count: 0 };
    series.push(point);
    index.set(date, point);
  }
  for (const p of payments) {
    const point = index.get(watDayKey(p.createdAt));
    if (point) {
      point.totalKobo += p.amountKobo;
      point.count += 1;
    }
  }
  return series;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @lumo/api exec vitest run src/services/analytics.service.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/analytics.service.ts apps/api/src/services/analytics.service.test.ts
git commit -m "feat(api): bucketRevenueByDay WAT-day revenue bucketer"
```

---

## Task 3: Service function `getRevenueSeries`

**Files:**
- Modify: `apps/api/src/services/analytics.service.ts`

- [ ] **Step 1: Add the service function**

In `apps/api/src/services/analytics.service.ts`, add at the end of the file:

```ts
// Fetch SUCCESS payments in range and bucket them. The 2h slack guards the WAT day boundary
// so payments early on the first WAT day (still "yesterday" in UTC) are not missed.
export async function getRevenueSeries(days: number): Promise<RevenueSeries> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * DAY_MS - 2 * 60 * 60 * 1000);
  const payments = await prisma.payment.findMany({
    where: { status: 'SUCCESS', createdAt: { gte: windowStart } },
    select: { createdAt: true, amountKobo: true },
  });
  return { days, series: bucketRevenueByDay(payments, days, now) };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @lumo/api typecheck`
Expected: exits 0 (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/analytics.service.ts
git commit -m "feat(api): getRevenueSeries — fetch + bucket SUCCESS payments"
```

---

## Task 4: Revenue route

**Files:**
- Modify: `apps/api/src/routes/admin/analytics.ts`

- [ ] **Step 1: Add the route**

Replace the contents of `apps/api/src/routes/admin/analytics.ts` with:

```ts
import { Router } from 'express';
import { adminRevenueQuerySchema } from '@lumo/shared';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getAdminAnalytics, getRevenueSeries } from '../../services/analytics.service';

// Mounted under /api/v1/admin/analytics (admin-guarded) — platform overview (PRD §20.20).
export const adminAnalyticsRouter: Router = Router();

adminAnalyticsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getAdminAnalytics());
  }),
);

// GET /api/v1/admin/analytics/revenue?days=7|30|90 — daily revenue series (defaults to 30).
adminAnalyticsRouter.get(
  '/revenue',
  asyncHandler(async (req, res) => {
    const { days } = adminRevenueQuerySchema.parse(req.query);
    res.json(await getRevenueSeries(days));
  }),
);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @lumo/api typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/admin/analytics.ts
git commit -m "feat(api): GET /admin/analytics/revenue endpoint"
```

---

## Task 5: Web revenue chart component

**Files:**
- Create: `apps/web/components/revenue-chart.tsx`

react-query keyed on `days` provides stale-response safety: when the user toggles fast, only
the active query key's data renders. No manual AbortController needed.

- [ ] **Step 1: Create the component**

Create `apps/web/components/revenue-chart.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RevenueSeries } from '@lumo/shared';
import { api } from '@/lib/api-client';
import { formatNaira } from '@/lib/format';

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

// "Jun 4" style short label from a YYYY-MM-DD key.
function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

export function RevenueChart() {
  const [days, setDays] = useState<Range>(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-revenue', days],
    queryFn: () => api.get<RevenueSeries>(`/admin/analytics/revenue?days=${days}`),
  });

  const series = data?.series ?? [];
  const maxKobo = Math.max(0, ...series.map((p) => p.totalKobo));
  const totalKobo = series.reduce((sum, p) => sum + p.totalKobo, 0);
  const allZero = maxKobo === 0;

  // SVG geometry.
  const W = 720;
  const H = 180;
  const PAD = 8;
  const barGap = 2;
  const barWidth = series.length ? (W - PAD * 2) / series.length - barGap : 0;

  return (
    <section
      className="rounded-lg border p-4"
      aria-label={`Revenue over the last ${days} days, total ${formatNaira(totalKobo)}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Revenue</h2>
        <div className="flex gap-1" role="group" aria-label="Select time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              aria-pressed={r === days}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                r === days ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[180px] animate-pulse rounded-md bg-muted" aria-hidden />
      ) : isError ? (
        <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <p>Couldn’t load revenue.</p>
          <button type="button" onClick={() => refetch()} className="rounded-md border px-3 py-1 hover:bg-accent">
            Retry
          </button>
        </div>
      ) : allZero ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
          No revenue yet
        </div>
      ) : (
        <>
          <p className="mb-1 text-xs text-muted-foreground">Max/day: {formatNaira(maxKobo)}</p>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`Daily revenue bar chart, ${days} days`}
          >
            {series.map((p, i) => {
              const h = maxKobo ? (p.totalKobo / maxKobo) * (H - PAD * 2) : 0;
              const x = PAD + i * (barWidth + barGap);
              return (
                <rect
                  key={p.date}
                  x={x}
                  y={H - PAD - h}
                  width={Math.max(1, barWidth)}
                  height={h}
                  className="fill-primary"
                >
                  <title>{`${dayLabel(p.date)}: ${formatNaira(p.totalKobo)} · ${p.count} payments`}</title>
                </rect>
              );
            })}
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="stroke-border" />
          </svg>
          <p className="mt-1 text-xs text-muted-foreground">
            {series.length ? `${dayLabel(series[0].date)} – ${dayLabel(series[series.length - 1].date)}` : ''}
          </p>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @lumo/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/revenue-chart.tsx
git commit -m "feat(web): revenue-chart SVG component with range toggle"
```

---

## Task 6: Mount on the admin overview

**Files:**
- Modify: `apps/web/app/admin/page.tsx`

- [ ] **Step 1: Import the component**

In `apps/web/app/admin/page.tsx`, add after the existing `import { StatCard } from '@/components/stat-card';` line:

```ts
import { RevenueChart } from '@/components/revenue-chart';
```

- [ ] **Step 2: Render the card**

In `apps/web/app/admin/page.tsx`, insert `<RevenueChart />` directly after the closing `</div>` of the stat-card grid (the `<div className="grid grid-cols-2 gap-3 sm:grid-cols-3"> … </div>` block) and before the `<div className="grid gap-3 sm:grid-cols-3">` quick-links block:

```tsx
      </div>

      <RevenueChart />

      <div className="grid gap-3 sm:grid-cols-3">
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @lumo/web typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/page.tsx
git commit -m "feat(web): mount revenue chart on admin overview"
```

---

## Task 7: Full verification

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: exits 0.

- [ ] **Step 2: Typecheck (all workspaces)**

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Step 3: API tests**

Run: `pnpm --filter @lumo/api test`
Expected: all pass, including the 4 new `bucketRevenueByDay` tests.

- [ ] **Step 4: Build all**

Run: `pnpm -r build`
Expected: exits 0; web build green (admin page still client-side).

- [ ] **Step 5: Update CLAUDE.md state line**

In `CLAUDE.md`, update the analytics follow-up note to record that the admin revenue-over-time chart is done (remove it from "Optional follow-ups").

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record admin revenue chart shipped"
```
