import { describe, it, expect, vi, beforeEach } from 'vitest';

// reindexAllApproved must scale past REINDEX_BATCH listings — paginate the Postgres read, the
// addDocuments writes, AND the stale-doc scan (the old code's getDocuments({limit:10000}) only
// ever saw the first page, so orphans beyond it were never removed). This proves the pagination
// itself, at REINDEX_BATCH scale, rather than relying on >10k real rows.

const REINDEX_BATCH = 1000;

const { listingFindMany, addDocuments, waitForTask, getDocuments, deleteDocuments, callOrder } = vi.hoisted(() => ({
  listingFindMany: vi.fn(),
  addDocuments: vi.fn(),
  waitForTask: vi.fn(),
  getDocuments: vi.fn(),
  deleteDocuments: vi.fn(),
  callOrder: [] as string[],
}));

vi.mock('../lib/prisma', () => ({ prisma: { listing: { findMany: listingFindMany } } }));
vi.mock('../lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('./listing.service', () => ({ listingInclude: {} }));
vi.mock('../lib/search', () => ({
  isSearchConfigured: true,
  buildListingDoc: (l: { id: string }) => ({ id: l.id }),
  getListingsIndex: () => ({
    addDocuments: (...args: unknown[]) => {
      callOrder.push('add');
      return addDocuments(...args);
    },
    waitForTask: (...args: unknown[]) => waitForTask(...args),
    getDocuments: (...args: unknown[]) => getDocuments(...args),
    deleteDocuments: (...args: unknown[]) => {
      callOrder.push('delete');
      return deleteDocuments(...args);
    },
  }),
}));

import { reindexAllApproved } from './search-sync';

function fixture(id: string) {
  return { id };
}

beforeEach(() => {
  vi.clearAllMocks();
  callOrder.length = 0;
  addDocuments.mockResolvedValue({ taskUid: 1 });
  waitForTask.mockResolvedValue({});
  deleteDocuments.mockResolvedValue({ taskUid: 2 });
});

describe('reindexAllApproved — pagination past REINDEX_BATCH', () => {
  it('indexes every listing across multiple Postgres batches, removes a stale doc beyond the first index page, and never deletes before all adds land', async () => {
    // Postgres: 1500 approved listings, paginated by id-cursor into 1000 + 500.
    const batch1 = Array.from({ length: REINDEX_BATCH }, (_, i) => fixture(`id_${String(i + 1).padStart(4, '0')}`));
    const batch2 = Array.from({ length: 500 }, (_, i) => fixture(`id_${String(i + 1001).padStart(4, '0')}`));
    listingFindMany
      .mockResolvedValueOnce(batch1)
      .mockResolvedValueOnce(batch2);

    // Meilisearch index: page 1 = the first 1000 live ids (full page, scan continues),
    // page 2 = the remaining 500 live ids + one orphan that sits beyond page 1.
    const indexPage1 = batch1.map((l) => ({ id: l.id }));
    const indexPage2 = [...batch2.map((l) => ({ id: l.id })), { id: 'orphan_1' }];
    getDocuments
      .mockResolvedValueOnce({ results: indexPage1 })
      .mockResolvedValueOnce({ results: indexPage2 });

    const total = await reindexAllApproved();

    expect(total).toBe(1500);

    // Stage 1: both Postgres batches got indexed.
    expect(listingFindMany).toHaveBeenCalledTimes(2);
    expect(listingFindMany.mock.calls[1]![0]).toMatchObject({ cursor: { id: 'id_1000' }, skip: 1 });
    expect(addDocuments).toHaveBeenCalledTimes(2);
    expect(addDocuments.mock.calls[0]![0]).toHaveLength(1000);
    expect(addDocuments.mock.calls[1]![0]).toHaveLength(500);
    expect(waitForTask).toHaveBeenCalledTimes(2);

    // Stage 2: the stale scan paginated too — proves it isn't a single limit:10000 call.
    expect(getDocuments).toHaveBeenCalledTimes(2);
    expect(getDocuments.mock.calls[0]![0]).toMatchObject({ offset: 0, limit: REINDEX_BATCH });
    expect(getDocuments.mock.calls[1]![0]).toMatchObject({ offset: REINDEX_BATCH, limit: REINDEX_BATCH });

    // Stage 3: only the true orphan (beyond page 1) was deleted.
    expect(deleteDocuments).toHaveBeenCalledTimes(1);
    expect(deleteDocuments).toHaveBeenCalledWith(['orphan_1']);

    // Index must never be momentarily empty: every add happens before any delete.
    expect(callOrder).toEqual(['add', 'add', 'delete']);
  });
});
