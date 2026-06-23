import { describe, it, expect, vi, beforeEach } from 'vitest';

// Seller trust-tiered auto-approval (moderation bypass, CLAUDE.md domain rule 2 exception) —
// verifies resolveInitialStatus's exact decision table and that createListing/updateListing
// fire the right auto-approve side effects (and never double-enqueue the search sync).

const {
  sellerProfile,
  user,
  listingCount,
  listingCreate,
  listingUpdate,
  listingFindUnique,
  categoryFindUnique,
  userUpdateMany,
  writeAudit,
  notify,
  enqueueListingSync,
  enqueueCheckSavedSearches,
  configMock,
} = vi.hoisted(() => ({
  sellerProfile: { findUnique: vi.fn(), upsert: vi.fn() },
  user: { findUnique: vi.fn() },
  listingCount: vi.fn(),
  listingCreate: vi.fn(),
  listingUpdate: vi.fn(),
  listingFindUnique: vi.fn(),
  categoryFindUnique: vi.fn(),
  userUpdateMany: vi.fn(),
  writeAudit: vi.fn(),
  notify: vi.fn(),
  enqueueListingSync: vi.fn(),
  enqueueCheckSavedSearches: vi.fn(),
  configMock: { AUTO_APPROVE_ENABLED: true },
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    sellerProfile,
    user: { findUnique: user.findUnique, updateMany: userUpdateMany },
    listing: {
      count: listingCount,
      create: listingCreate,
      update: listingUpdate,
      findUnique: listingFindUnique,
    },
    category: { findUnique: categoryFindUnique },
  },
}));
vi.mock('../config/env', () => ({ config: configMock }));
vi.mock('../lib/audit', () => ({ writeAudit }));
vi.mock('../lib/notify', () => ({ notify }));
vi.mock('../lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('../lib/queue', () => ({ enqueueListingSync, enqueueCheckSavedSearches }));
vi.mock('../middleware/rbac', () => ({ assertOwnership: vi.fn() }));

import { resolveInitialStatus, createListing, updateListing } from './listing.service';

const DAY_MS = 86_400_000;
const OLD_ENOUGH = { createdAt: new Date(Date.now() - 10 * DAY_MS) };
const TOO_NEW = { createdAt: new Date(Date.now() - 1000) };

function hydratedListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    slug: 'lagos-test-item-ab12cd',
    title: 'Test item',
    description: 'desc',
    priceKobo: 10_000,
    condition: 'USED',
    status: 'PENDING',
    state: 'Lagos',
    city: 'Lagos',
    area: null,
    categoryId: 'cat1',
    isPromoted: false,
    promotedUntil: null,
    expiresAt: new Date(Date.now() + 30 * DAY_MS),
    viewsCount: 0,
    createdAt: new Date(),
    images: [],
    category: { id: 'cat1', name: 'Cat', slug: 'cat', attributeSchema: null },
    owner: {
      id: 'u1',
      name: 'Seller',
      avatarUrl: null,
      createdAt: new Date(),
      sellerProfile: { verification: 'NONE', ratingAvg: 0, ratingCount: 0, avgReplyHours: null },
    },
    promotionTier: 'NONE',
    attributes: null,
    marketLowKobo: null,
    marketHighKobo: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  configMock.AUTO_APPROVE_ENABLED = true;
  listingCount.mockResolvedValue(0); // default: no approvals, no unclean history
});

describe('resolveInitialStatus', () => {
  it('verified seller -> APPROVED', async () => {
    sellerProfile.findUnique.mockResolvedValue({ verification: 'VERIFIED' });
    user.findUnique.mockResolvedValue(OLD_ENOUGH);

    await expect(resolveInitialStatus('u1')).resolves.toBe('APPROVED');
  });

  it('brand-new seller (no track record, not verified) -> PENDING', async () => {
    sellerProfile.findUnique.mockResolvedValue({ verification: 'NONE' });
    user.findUnique.mockResolvedValue(OLD_ENOUGH);
    listingCount.mockResolvedValue(0); // approvals count

    await expect(resolveInitialStatus('u1')).resolves.toBe('PENDING');
  });

  it('non-verified seller with 3 clean prior approvals -> APPROVED', async () => {
    sellerProfile.findUnique.mockResolvedValue({ verification: 'NONE' });
    user.findUnique.mockResolvedValue(OLD_ENOUGH);
    listingCount
      .mockResolvedValueOnce(3) // approvals count >= AUTO_APPROVE_MIN_APPROVALS
      .mockResolvedValueOnce(0); // unclean count

    await expect(resolveInitialStatus('u1')).resolves.toBe('APPROVED');
  });

  it('same seller but with a rejection 5 days ago -> PENDING', async () => {
    sellerProfile.findUnique.mockResolvedValue({ verification: 'NONE' });
    user.findUnique.mockResolvedValue(OLD_ENOUGH);
    listingCount
      .mockResolvedValueOnce(3) // approvals count
      .mockResolvedValueOnce(1); // unclean count (the recent rejection)

    await expect(resolveInitialStatus('u1')).resolves.toBe('PENDING');
  });

  it('account younger than 1 day -> PENDING even if otherwise trusted', async () => {
    sellerProfile.findUnique.mockResolvedValue({ verification: 'VERIFIED' });
    user.findUnique.mockResolvedValue(TOO_NEW);

    await expect(resolveInitialStatus('u1')).resolves.toBe('PENDING');
  });

  it('kill switch off -> PENDING even for an otherwise-trusted seller', async () => {
    configMock.AUTO_APPROVE_ENABLED = false;
    sellerProfile.findUnique.mockResolvedValue({ verification: 'VERIFIED' });
    user.findUnique.mockResolvedValue(OLD_ENOUGH);

    await expect(resolveInitialStatus('u1')).resolves.toBe('PENDING');
    expect(sellerProfile.findUnique).not.toHaveBeenCalled(); // short-circuits before any query
  });
});

describe('createListing auto-approve', () => {
  const input = {
    title: 'Test item',
    description: 'A perfectly good description.',
    priceKobo: 10_000,
    condition: 'USED',
    state: 'Lagos',
    city: 'Lagos',
    categoryId: 'cl000000000000000000cat1',
  };

  beforeEach(() => {
    categoryFindUnique.mockResolvedValue({ id: 'cat1' });
    sellerProfile.upsert.mockResolvedValue({});
    userUpdateMany.mockResolvedValue({ count: 0 });
    listingFindUnique.mockResolvedValue(null); // slug is unique
  });

  it('auto-approves and fires enqueueListingSync + enqueueCheckSavedSearches exactly once each', async () => {
    sellerProfile.findUnique.mockResolvedValue({ verification: 'VERIFIED' });
    user.findUnique.mockResolvedValue(OLD_ENOUGH);
    listingCreate.mockResolvedValue(hydratedListing({ status: 'APPROVED' }));

    await createListing(input, 'u1');

    expect(listingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
    expect(enqueueListingSync).toHaveBeenCalledTimes(1);
    expect(enqueueListingSync).toHaveBeenCalledWith('l1');
    expect(enqueueCheckSavedSearches).toHaveBeenCalledTimes(1);
    expect(enqueueCheckSavedSearches).toHaveBeenCalledWith('l1');
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'listing.auto_approve' }));
    expect(notify).toHaveBeenCalledWith('u1', 'listing.approved', expect.anything());
  });

  it('untrusted seller stays PENDING and triggers no auto-approve side effects', async () => {
    sellerProfile.findUnique.mockResolvedValue({ verification: 'NONE' });
    user.findUnique.mockResolvedValue(OLD_ENOUGH);
    listingCreate.mockResolvedValue(hydratedListing({ status: 'PENDING' }));

    await createListing(input, 'u1');

    expect(listingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) }),
    );
    expect(enqueueListingSync).not.toHaveBeenCalled();
    expect(enqueueCheckSavedSearches).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });
});

describe('updateListing verified-edit auto-approve', () => {
  const existing = {
    id: 'l1',
    ownerId: 'u1',
    categoryId: 'cat1',
    status: 'APPROVED',
    deletedAt: null,
    priceKobo: 10_000,
  };

  it('verified seller editing -> APPROVED', async () => {
    listingFindUnique.mockResolvedValue(existing);
    sellerProfile.findUnique.mockResolvedValue({ verification: 'VERIFIED' });
    listingUpdate.mockResolvedValue(hydratedListing({ status: 'APPROVED' }));

    await updateListing('l1', { title: 'New title' }, { id: 'u1', roles: ['SELLER'] });

    expect(listingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
    expect(enqueueCheckSavedSearches).toHaveBeenCalledWith('l1');
    expect(enqueueListingSync).toHaveBeenCalledTimes(1); // from applyAutoApprove, not double-fired
  });

  it('track-record (non-verified) seller editing -> PENDING', async () => {
    listingFindUnique.mockResolvedValue(existing);
    sellerProfile.findUnique.mockResolvedValue({ verification: 'NONE' });
    listingUpdate.mockResolvedValue(hydratedListing({ status: 'PENDING' }));

    await updateListing('l1', { title: 'New title' }, { id: 'u1', roles: ['SELLER'] });

    expect(listingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) }),
    );
    expect(enqueueCheckSavedSearches).not.toHaveBeenCalled();
    expect(enqueueListingSync).toHaveBeenCalledTimes(1); // the plain re-pend enqueue
  });
});
