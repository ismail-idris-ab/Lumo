import { describe, it, expect, vi, beforeEach } from 'vitest';

// Read-time expiry guard: search must not depend solely on the sweep re-syncing in time —
// every Meili query filters expiresAt > now in addition to status = "APPROVED".

const { search } = vi.hoisted(() => ({ search: vi.fn() }));

vi.mock('../lib/search', () => ({
  isSearchConfigured: true,
  getListingsIndex: () => ({ search }),
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
