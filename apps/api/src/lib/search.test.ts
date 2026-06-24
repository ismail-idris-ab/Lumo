import { describe, it, expect, vi } from 'vitest';
import type { HydratedListing } from '../services/listing.service';

// ensureSearchIndex's pagination.maxTotalHits is what raises the deep-pagination cap — mock
// the meilisearch client + config so this test exercises the real updateSettings call.
const { updateSettingsMock, MeiliSearchMock } = vi.hoisted(() => {
  const updateSettingsMock = vi.fn().mockResolvedValue({ taskUid: 2 });
  const waitForTaskMock = vi.fn().mockResolvedValue({});
  const createIndexMock = vi.fn().mockResolvedValue({ taskUid: 1 });
  const indexMock = vi.fn(() => ({ updateSettings: updateSettingsMock }));
  // Must be constructible (`new MeiliSearch(...)`) — a plain function, not an arrow.
  const MeiliSearchMock = vi.fn(function MeiliSearch() {
    return { createIndex: createIndexMock, waitForTask: waitForTaskMock, index: indexMock };
  });
  return { updateSettingsMock, MeiliSearchMock };
});

vi.mock('meilisearch', () => ({ MeiliSearch: MeiliSearchMock }));
vi.mock('../config/env', () => ({ config: { SEARCH_HOST: 'https://search.test', SEARCH_API_KEY: 'key' } }));

import { buildListingDoc, ensureSearchIndex, FILTERABLE, MAX_TOTAL_HITS } from './search';

// tierWeight:desc in RANKING_RULES only does anything if buildListingDoc derives a non-zero
// tierWeight from real, expiry-aware promotion state — promotionTier itself is never written
// anywhere (dormant, reserved for a future multi-tier feature), so tierWeight must come from
// isPromoted + promotedUntil instead.

function fixture(overrides: Partial<{ isPromoted: boolean; promotedUntil: Date | null; expiresAt: Date }>): HydratedListing {
  return {
    id: 'l1',
    slug: 'lagos-test-item-ab12cd',
    title: 'Test item',
    description: 'A description long enough to pass validation.',
    priceKobo: 10_000,
    condition: 'USED',
    status: 'APPROVED',
    state: 'Lagos',
    city: 'Lagos',
    area: null,
    categoryId: 'cat1',
    isPromoted: false,
    promotedUntil: null,
    promotionTier: 'NONE',
    attributes: null,
    contactPhone: null,
    marketLowKobo: null,
    marketHighKobo: null,
    expiresAt: new Date(Date.now() + 30 * 86_400_000),
    viewsCount: 0,
    lastFreshnessNudgeAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ownerId: 'u1',
    images: [],
    category: { id: 'cat1', name: 'Cat', slug: 'cat', attributeSchema: null },
    owner: {
      id: 'u1',
      name: 'Seller',
      avatarUrl: null,
      createdAt: new Date(),
      sellerProfile: { verification: 'NONE', ratingAvg: 0, ratingCount: 0, avgReplyHours: null },
    },
    ...overrides,
  } as unknown as HydratedListing;
}

describe('buildListingDoc — promotion derivation', () => {
  it('isPromoted true + promotedUntil in the future -> tierWeight 1, isPromoted true', () => {
    const doc = buildListingDoc(
      fixture({ isPromoted: true, promotedUntil: new Date(Date.now() + 86_400_000) }),
    );
    expect(doc.tierWeight).toBe(1);
    expect(doc.isPromoted).toBe(true);
  });

  it('isPromoted true + promotedUntil in the past -> tierWeight 0, isPromoted false', () => {
    const doc = buildListingDoc(
      fixture({ isPromoted: true, promotedUntil: new Date(Date.now() - 86_400_000) }),
    );
    expect(doc.tierWeight).toBe(0);
    expect(doc.isPromoted).toBe(false);
  });

  it('isPromoted false -> tierWeight 0, isPromoted false (regardless of promotedUntil)', () => {
    const doc = buildListingDoc(
      fixture({ isPromoted: false, promotedUntil: new Date(Date.now() + 86_400_000) }),
    );
    expect(doc.tierWeight).toBe(0);
    expect(doc.isPromoted).toBe(false);
  });
});

describe('buildListingDoc — expiresAt', () => {
  it('emits expiresAt as the listing.expiresAt epoch ms, for the read-time expiry filter', () => {
    const expiresAt = new Date(Date.now() + 15 * 86_400_000);
    const doc = buildListingDoc(fixture({ expiresAt }));
    expect(doc.expiresAt).toBe(expiresAt.getTime());
  });

  it("registers 'expiresAt' as filterable so the read-time expiry filter doesn't throw", () => {
    expect(FILTERABLE).toContain('expiresAt');
  });
});

describe('ensureSearchIndex — deep-pagination cap', () => {
  it('sets pagination.maxTotalHits to MAX_TOTAL_HITS', async () => {
    await ensureSearchIndex();
    expect(updateSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({ pagination: { maxTotalHits: MAX_TOTAL_HITS } }),
    );
  });
});
