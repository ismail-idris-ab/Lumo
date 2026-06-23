import { describe, it, expect } from 'vitest';
import { buildListingDoc } from './search';
import type { HydratedListing } from '../services/listing.service';

// tierWeight:desc in RANKING_RULES only does anything if buildListingDoc derives a non-zero
// tierWeight from real, expiry-aware promotion state — promotionTier itself is never written
// anywhere (dormant, reserved for a future multi-tier feature), so tierWeight must come from
// isPromoted + promotedUntil instead.

function fixture(overrides: Partial<{ isPromoted: boolean; promotedUntil: Date | null }>): HydratedListing {
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
