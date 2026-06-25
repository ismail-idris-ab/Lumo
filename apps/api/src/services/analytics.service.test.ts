import { describe, it, expect } from 'vitest';
import { bucketRevenueByDay, aggregateModeratorActivity } from './analytics.service';

// Fixed "now": 2026-06-10T12:00:00Z → WAT day 2026-06-10.
const NOW = new Date('2026-06-10T12:00:00Z');

describe('bucketRevenueByDay', () => {
  it('zero-fills to exactly `days` ascending points when there are no payments', () => {
    const series = bucketRevenueByDay([], 7, NOW);
    expect(series).toHaveLength(7);
    expect(series[0]?.date).toBe('2026-06-04'); // 6 days before today (WAT)
    expect(series[6]?.date).toBe('2026-06-10'); // today (WAT)
    expect(series.every((p) => p.totalKobo === 0 && p.count === 0)).toBe(true);
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
    const series = bucketRevenueByDay(
      [{ createdAt: new Date('2026-06-04T23:30:00Z'), amountKobo: 10000 }],
      7,
      NOW,
    );
    const watDay = series.find((p) => p.date === '2026-06-05');
    const prevDay = series.find((p) => p.date === '2026-06-04');
    expect(watDay?.totalKobo).toBe(10000);
    expect(prevDay?.totalKobo).toBe(0);
  });

  it('includes a payment on the window-start day and excludes one before the window', () => {
    const series = bucketRevenueByDay(
      [
        { createdAt: new Date('2026-06-04T10:00:00Z'), amountKobo: 1000 },
        { createdAt: new Date('2026-06-03T10:00:00Z'), amountKobo: 9999 },
      ],
      7,
      NOW,
    );
    const windowStartDay = series.find((p) => p.date === '2026-06-04');
    expect(windowStartDay?.totalKobo).toBe(1000);
    expect(series.some((p) => p.date === '2026-06-03')).toBe(false);
  });
});

describe('aggregateModeratorActivity', () => {
  const users = [
    { id: 'mod-1', name: 'Amaka', email: 'amaka@lumo.test' },
    { id: 'mod-2', name: 'Bayo', email: 'bayo@lumo.test' },
  ];

  it('sums total actions per actor and keeps the per-action breakdown', () => {
    const result = aggregateModeratorActivity(
      [
        { actorId: 'mod-1', action: 'listing.approve', count: 5 },
        { actorId: 'mod-1', action: 'listing.reject', count: 2 },
        { actorId: 'mod-2', action: 'report.resolve', count: 3 },
      ],
      users,
    );

    const amaka = result.find((m) => m.actorId === 'mod-1');
    expect(amaka).toEqual({
      actorId: 'mod-1',
      name: 'Amaka',
      email: 'amaka@lumo.test',
      totalActions: 7,
      byAction: { 'listing.approve': 5, 'listing.reject': 2 },
    });
  });

  it('sorts by total actions descending', () => {
    const result = aggregateModeratorActivity(
      [
        { actorId: 'mod-1', action: 'listing.approve', count: 1 },
        { actorId: 'mod-2', action: 'report.resolve', count: 10 },
      ],
      users,
    );
    expect(result.map((m) => m.actorId)).toEqual(['mod-2', 'mod-1']);
  });

  it('falls back to "Unknown" for an actor with no matching user row', () => {
    const result = aggregateModeratorActivity(
      [{ actorId: 'ghost', action: 'listing.approve', count: 1 }],
      users,
    );
    expect(result).toEqual([
      { actorId: 'ghost', name: 'Unknown', email: '', totalActions: 1, byAction: { 'listing.approve': 1 } },
    ]);
  });

  it('returns an empty array when there are no rows', () => {
    expect(aggregateModeratorActivity([], users)).toEqual([]);
  });
});
