import { describe, it, expect } from 'vitest';
import { bucketRevenueByDay } from './analytics.service';

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
