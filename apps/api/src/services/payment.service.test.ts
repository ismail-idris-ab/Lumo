import { describe, it, expect, vi, beforeEach } from 'vitest';

// fulfillPayment is the revenue-critical, attacker-adjacent surface: it runs only after a
// verified Paystack signature and MUST be idempotent, amount-matched, and ignore unknown refs
// (CLAUDE.md domain rule 6). These mocks keep the test DB-free like the rest of the suite while
// asserting the guard logic and that a valid PROMOTION actually fulfils + side-effects fire.

// Stubs live in a hoisted block so they exist when the (also-hoisted) vi.mock factories run.
const {
  payment,
  listing,
  verificationRequest,
  sellerSubscription,
  $transaction,
  writeAudit,
  notify,
  emailUser,
  enqueueListingSync,
} = vi.hoisted(() => {
  const payment = { findUnique: vi.fn(), updateMany: vi.fn() };
  const listing = { update: vi.fn() };
  const verificationRequest = { updateMany: vi.fn() };
  const sellerSubscription = { create: vi.fn() };
  return {
    payment,
    listing,
    verificationRequest,
    sellerSubscription,
    // $transaction runs the callback with a `tx` exposing the same model stubs.
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) =>
      cb({
        payment,
        listing,
        verificationRequest,
        sellerSubscription,
        sellerProfile: { upsert: vi.fn() },
      }),
    ),
    writeAudit: vi.fn(),
    notify: vi.fn(),
    emailUser: vi.fn(),
    enqueueListingSync: vi.fn(),
  };
});

vi.mock('../lib/prisma', () => ({
  prisma: { payment, listing, verificationRequest, $transaction },
}));
vi.mock('../lib/audit', () => ({ writeAudit }));
vi.mock('../lib/notify', () => ({ notify }));
vi.mock('../lib/email', () => ({ emailUser }));
vi.mock('../lib/queue', () => ({ enqueueListingSync }));

import { fulfillPayment } from './payment.service';

const PENDING_PROMO = {
  id: 'pay_1',
  userId: 'u1',
  purpose: 'PROMOTION' as const,
  amountKobo: 50_000,
  status: 'PENDING' as const,
  reference: 'lumo_ref_1',
  targetId: 'listing_1',
  metadata: { days: 7, purpose: 'PROMOTION' },
};

beforeEach(() => {
  vi.clearAllMocks();
  payment.updateMany.mockResolvedValue({ count: 1 });
});

describe('fulfillPayment — money-path guards', () => {
  it('ignores an unknown reference (no fulfilment, no audit)', async () => {
    payment.findUnique.mockResolvedValue(null);

    await fulfillPayment('does_not_exist', 50_000);

    expect($transaction).not.toHaveBeenCalled();
    expect(payment.updateMany).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it('is idempotent: a payment already SUCCESS is not re-fulfilled', async () => {
    payment.findUnique.mockResolvedValue({ ...PENDING_PROMO, status: 'SUCCESS' });

    await fulfillPayment(PENDING_PROMO.reference, PENDING_PROMO.amountKobo);

    expect($transaction).not.toHaveBeenCalled();
    expect(listing.update).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('refuses to fulfil when the paid amount does not match the server price', async () => {
    payment.findUnique.mockResolvedValue(PENDING_PROMO);

    await fulfillPayment(PENDING_PROMO.reference, 100); // attacker underpays

    expect($transaction).not.toHaveBeenCalled();
    expect(payment.updateMany).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it('fulfils a valid PROMOTION: marks SUCCESS, promotes listing, reindexes, audits, notifies', async () => {
    payment.findUnique.mockResolvedValue(PENDING_PROMO);

    await fulfillPayment(PENDING_PROMO.reference, PENDING_PROMO.amountKobo);

    expect(payment.updateMany).toHaveBeenCalledWith({
      where: { reference: PENDING_PROMO.reference, status: 'PENDING' },
      data: { status: 'SUCCESS' },
    });
    expect(listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing_1' },
        data: expect.objectContaining({ isPromoted: true }),
      }),
    );
    expect(enqueueListingSync).toHaveBeenCalledWith('listing_1');
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'payment.success' }));
    expect(notify).toHaveBeenCalledWith('u1', 'payment.success', expect.anything());
  });

  it('fulfils a VERIFICATION by unlocking the fee gate (feePaid) for the owner’s PENDING request', async () => {
    payment.findUnique.mockResolvedValue({
      ...PENDING_PROMO,
      id: 'pay_2',
      purpose: 'VERIFICATION',
      amountKobo: 200_000,
      reference: 'lumo_ref_2',
      targetId: 'vr_1',
      metadata: { requestId: 'vr_1', purpose: 'VERIFICATION' },
    });

    await fulfillPayment('lumo_ref_2', 200_000);

    expect(verificationRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vr_1', userId: 'u1', status: 'PENDING' },
        data: { feePaid: true },
      }),
    );
  });

  it('grants exactly once when two concurrent calls both observe PENDING (webhook retry vs reconcile)', async () => {
    const PENDING_SUB = {
      id: 'pay_3',
      userId: 'u1',
      purpose: 'SUBSCRIPTION' as const,
      amountKobo: 500_000,
      status: 'PENDING' as const,
      reference: 'lumo_ref_3',
      targetId: 'plan_1',
      metadata: { planId: 'plan_1', purpose: 'SUBSCRIPTION' },
    };
    // Both invocations read PENDING via findUnique before either's transaction runs —
    // that's the race. Only the first updateMany actually claims the row (count: 1);
    // the second loses (count: 0) because the first already flipped status to SUCCESS.
    payment.findUnique.mockResolvedValue(PENDING_SUB);
    payment.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await fulfillPayment(PENDING_SUB.reference, PENDING_SUB.amountKobo);
    await fulfillPayment(PENDING_SUB.reference, PENDING_SUB.amountKobo);

    expect(sellerSubscription.create).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(emailUser).toHaveBeenCalledTimes(1);
  });
});
