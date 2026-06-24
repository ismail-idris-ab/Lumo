import { describe, it, expect, vi, beforeEach } from 'vitest';

// Read-time expiry guard: search must not depend solely on the sweep re-syncing in time —
// every Meili query filters expiresAt > now in addition to status = "APPROVED".
// Also: deep pagination past Meili's maxTotalHits must fail cleanly (empty page), not throw
// into the silent Postgres fallback, and must never request/report past the cap.

const MAX_TOTAL_HITS = 10_000;

const { search } = vi.hoisted(() => ({ search: vi.fn() }));

vi.mock('../lib/search', () => ({
  isSearchConfigured: true,
  getListingsIndex: () => ({ search }),
  MAX_TOTAL_HITS: 10_000,
}));
vi.mock('./listing.service', () => ({ listPublicListings: vi.fn() }));
vi.mock('../lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { searchListings } from './search.service';

beforeEach(() => {
  vi.clearAllMocks();
  search.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });
});

describe('searchListings — read-time expiry filter', () => {
  it('builds a filter array with status and an unquoted numeric expiresAt > now clause', async () => {
    const before = Date.now();
    await searchListings({ page: 1, limit: 20 });
    const after = Date.now();

    const { filter } = search.mock.calls[0]![1] as { filter: string[] };
    expect(filter).toContain('status = "APPROVED"');

    const expiryClause = filter.find((f) => f.startsWith('expiresAt > '));
    expect(expiryClause).toBeDefined();
    const cutoff = Number(expiryClause!.replace('expiresAt > ', ''));
    expect(Number.isNaN(cutoff)).toBe(false); // unquoted numeric, not a quoted string
    expect(cutoff).toBeGreaterThanOrEqual(before);
    expect(cutoff).toBeLessThanOrEqual(after);
  });
});

describe('searchListings — deep pagination past MAX_TOTAL_HITS', () => {
  it('returns a clean empty page without calling Meili when offset >= MAX_TOTAL_HITS', async () => {
    const page = MAX_TOTAL_HITS / 20 + 1; // offset = MAX_TOTAL_HITS, exactly at the cap
    const result = await searchListings({ page, limit: 20 });

    expect(search).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [],
      page,
      limit: 20,
      total: MAX_TOTAL_HITS,
      totalPages: Math.ceil(MAX_TOTAL_HITS / 20),
    });
  });

  it('clamps the limit on the boundary page instead of requesting past the cap', async () => {
    // listingQuerySchema caps limit at 100, so pick values that straddle the boundary within
    // that ceiling: offset 9960 (< cap), offset+limit 10020 (> cap).
    const limit = 60;
    const offset = 9_960;
    const page = offset / limit + 1;
    await searchListings({ page, limit });

    const { limit: requestedLimit, offset: requestedOffset } = search.mock.calls[0]![1] as {
      limit: number;
      offset: number;
    };
    expect(requestedOffset).toBe(offset);
    expect(requestedLimit).toBe(40); // clamped to MAX_TOTAL_HITS - offset, not the full 60
  });

  it('never reports a total greater than MAX_TOTAL_HITS', async () => {
    search.mockResolvedValue({ hits: [], estimatedTotalHits: MAX_TOTAL_HITS + 5_000 });
    const result = await searchListings({ page: 1, limit: 20 });
    expect(result.total).toBe(MAX_TOTAL_HITS);
  });
});
