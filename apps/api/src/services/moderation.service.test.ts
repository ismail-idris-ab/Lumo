import { describe, it, expect, vi, beforeEach } from 'vitest';

// Moderation drives the listing status state machine + the audit/notify/reindex side effects
// each admin action must fire (CLAUDE.md domain rule 3, 7). DB-free: Prisma and the side-effect
// libs are mocked; toPublicListing is a passthrough so we inspect what was written.

const { listing, writeAudit, notify, emailUser, enqueueListingSync, enqueueCheckSavedSearches } = vi.hoisted(() => ({
  listing: { findUnique: vi.fn(), update: vi.fn() },
  writeAudit: vi.fn(),
  notify: vi.fn(),
  emailUser: vi.fn(),
  enqueueListingSync: vi.fn(),
  enqueueCheckSavedSearches: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({ prisma: { listing } }));
vi.mock('../lib/audit', () => ({ writeAudit }));
vi.mock('../lib/notify', () => ({ notify }));
vi.mock('../lib/email', () => ({ emailUser }));
vi.mock('../lib/queue', () => ({ enqueueListingSync, enqueueCheckSavedSearches }));
vi.mock('./listing.service', () => ({
  listingInclude: {},
  toPublicListing: (l: unknown) => l, // passthrough — we control the shape via the update mock
}));

import {
  approveListing,
  rejectListing,
  suspendListing,
  requestChanges,
  adminDeleteListing,
} from './moderation.service';

const actor = { id: 'admin_1', ip: '127.0.0.1' };

// before-state returned by loadListing; the updated row carries the new status + seller for notify.
function arrange(updatedStatus: string) {
  listing.findUnique.mockResolvedValue({ id: 'l1', ownerId: 'seller_1', status: 'PENDING', deletedAt: null });
  listing.update.mockResolvedValue({
    id: 'l1',
    status: updatedStatus,
    slug: 'lagos-iphone-ab12cd',
    title: 'iPhone 13',
    seller: { id: 'seller_1' },
  });
}

// The `data` arg passed to the most recent prisma.listing.update call.
const updateData = (): Record<string, unknown> =>
  (listing.update.mock.calls.at(-1)![0] as { data: Record<string, unknown> }).data;

beforeEach(() => vi.clearAllMocks());

describe('moderation status transitions', () => {
  it('approve → APPROVED, sets expiresAt, audits, reindexes, notifies the seller', async () => {
    arrange('APPROVED');
    await approveListing('l1', actor);

    const data = updateData();
    expect(data.status).toBe('APPROVED');
    const expiresAt = data.expiresAt as Date;
    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'listing.approve' }));
    expect(enqueueListingSync).toHaveBeenCalledWith('l1');
    expect(notify).toHaveBeenCalledWith('seller_1', 'listing.approved', expect.anything());
  });

  it('reject → REJECTED, requires a reason, carries it into audit + notify', async () => {
    arrange('REJECTED');
    await rejectListing('l1', { reason: 'Prohibited item' }, actor);

    expect(updateData().status).toBe('REJECTED');
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'listing.reject', after: expect.objectContaining({ reason: 'Prohibited item' }) }),
    );
    expect(notify).toHaveBeenCalledWith('seller_1', 'listing.rejected', expect.objectContaining({ reason: 'Prohibited item' }));
  });

  it('reject rejects an empty/invalid reason (schema guard)', async () => {
    arrange('REJECTED');
    await expect(rejectListing('l1', { reason: '' }, actor)).rejects.toBeTruthy();
    expect(listing.update).not.toHaveBeenCalled();
  });

  it('suspend → SUSPENDED with reason', async () => {
    arrange('SUSPENDED');
    await suspendListing('l1', { reason: 'Reported repeatedly' }, actor);
    expect(updateData().status).toBe('SUSPENDED');
    expect(notify).toHaveBeenCalledWith('seller_1', 'listing.suspended', expect.anything());
  });

  it('requestChanges keeps status PENDING and notifies with the note', async () => {
    arrange('PENDING');
    await requestChanges('l1', { note: 'Add clearer photos' }, actor);
    expect(updateData().status).toBe('PENDING');
    expect(notify).toHaveBeenCalledWith('seller_1', 'listing.changes_requested', expect.objectContaining({ note: 'Add clearer photos' }));
  });

  it('adminDelete → DELETED + soft-delete timestamp, reindexes, notifies owner', async () => {
    listing.findUnique.mockResolvedValue({ id: 'l1', ownerId: 'seller_1', status: 'APPROVED', deletedAt: null });
    listing.update.mockResolvedValue({ id: 'l1', status: 'DELETED' });

    await adminDeleteListing('l1', actor);

    const data = updateData();
    expect(data.status).toBe('DELETED');
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(enqueueListingSync).toHaveBeenCalledWith('l1');
    expect(notify).toHaveBeenCalledWith('seller_1', 'listing.deleted_by_admin', expect.anything());
  });

  it('throws notFound for a missing or already-deleted listing', async () => {
    listing.findUnique.mockResolvedValue(null);
    await expect(approveListing('gone', actor)).rejects.toMatchObject({ statusCode: 404 });
    expect(listing.update).not.toHaveBeenCalled();
  });
});
