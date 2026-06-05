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
      aria-label={
        data
          ? `Revenue over the last ${days} days, total ${formatNaira(totalKobo)}`
          : `Revenue over the last ${days} days`
      }
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
          <p>Couldn't load revenue.</p>
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
            {series.length ? `${dayLabel(series[0]!.date)} – ${dayLabel(series[series.length - 1]!.date)}` : ''}
          </p>
        </>
      )}
    </section>
  );
}
