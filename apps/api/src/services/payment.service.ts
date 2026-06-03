import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  initiatePaymentSchema,
  FEATURED_DAYS,
  FEATURED_PRICE_KOBO,
  VERIFICATION_FEE_KOBO,
  type PaymentDTO,
  type Role,
} from '@lumo/shared';
import type { Payment, PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { config } from '../config/env';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { initializeTransaction, isPaystackConfigured, verifyTransaction } from '../lib/paystack';
import { PAYMENT_STALE_MS } from '../jobs/queues';
import { writeAudit } from '../lib/audit';
import { notify } from '../lib/notify';
import { emailUser } from '../lib/email';
import { enqueueListingSync } from '../lib/queue';
import { assertOwnership } from '../middleware/rbac';

type Principal = { id: string; roles: Role[] };

const DAY_MS = 86_400_000;
const addDays = (days: number) => new Date(Date.now() + days * DAY_MS);

function genReference(): string {
  return `lumo_${randomBytes(12).toString('hex')}`;
}

export interface InitiateResult {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  publicKey: string | undefined;
}

// Resolve the server-side price + target for a purpose. Client never supplies the amount.
async function price(
  data: ReturnType<typeof initiatePaymentSchema.parse>,
  actor: Principal,
): Promise<{ amountKobo: number; targetId: string; metadata: Record<string, unknown> }> {
  switch (data.purpose) {
    case 'PROMOTION': {
      const [listing, pkg] = await Promise.all([
        prisma.listing.findUnique({ where: { id: data.listingId } }),
        prisma.promotionPackage.findUnique({ where: { id: data.packageId } }),
      ]);
      if (!listing || listing.deletedAt) throw AppError.notFound('Listing not found');
      assertOwnership(actor, listing.ownerId);
      if (!pkg || !pkg.active) throw AppError.badRequest('Promotion package not found');
      return { amountKobo: pkg.priceKobo, targetId: listing.id, metadata: { packageId: pkg.id, days: pkg.days } };
    }
    case 'SUBSCRIPTION': {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
      if (!plan || !plan.active) throw AppError.badRequest('Subscription plan not found');
      return { amountKobo: plan.priceKobo, targetId: plan.id, metadata: { planId: plan.id } };
    }
    case 'FEATURED':
      return { amountKobo: FEATURED_PRICE_KOBO, targetId: actor.id, metadata: { days: FEATURED_DAYS } };
    case 'VERIFICATION':
      return {
        amountKobo: VERIFICATION_FEE_KOBO,
        targetId: data.requestId ?? actor.id,
        metadata: { requestId: data.requestId },
      };
  }
}

export async function initiatePayment(actor: Principal, input: unknown): Promise<InitiateResult> {
  if (!isPaystackConfigured) throw new AppError(503, 'INTERNAL_ERROR', 'Payments are not configured');
  const data = initiatePaymentSchema.parse(input);
  const { amountKobo, targetId, metadata } = await price(data, actor);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { email: true } });
  const reference = genReference();

  // Create the PENDING record FIRST so the reference is reserved + webhook can find it.
  await prisma.payment.create({
    data: {
      userId: actor.id,
      purpose: data.purpose,
      amountKobo,
      status: 'PENDING',
      reference,
      targetId,
      metadata: { ...metadata, purpose: data.purpose } as Prisma.InputJsonValue,
    },
  });

  const init = await initializeTransaction({
    email: user.email,
    amountKobo,
    reference,
    metadata: { ...metadata, userId: actor.id, purpose: data.purpose },
  });

  return {
    reference,
    authorizationUrl: init.authorizationUrl,
    accessCode: init.accessCode,
    publicKey: config.PAYSTACK_PUBLIC_KEY,
  };
}

// Webhook fulfilment — ONLY called after a verified Paystack signature (TRD §6, §14).
// Idempotent on reference; never trusts the client.
export async function fulfillPayment(reference: string, paidAmountKobo: number): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    logger.warn({ reference }, 'Webhook for unknown payment reference — ignoring');
    return;
  }
  if (payment.status === 'SUCCESS') return; // already fulfilled (idempotent)
  if (paidAmountKobo !== payment.amountKobo) {
    logger.warn(
      { reference, expected: payment.amountKobo, paid: paidAmountKobo },
      'Webhook amount mismatch — not fulfilling',
    );
    return;
  }

  const meta = (payment.metadata ?? {}) as Record<string, unknown>;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { reference }, data: { status: 'SUCCESS' } });

    switch (payment.purpose) {
      case 'PROMOTION': {
        const days = Number(meta.days ?? 7);
        if (payment.targetId) {
          await tx.listing.update({
            where: { id: payment.targetId },
            data: { isPromoted: true, promotedUntil: addDays(days) },
          });
        }
        break;
      }
      case 'SUBSCRIPTION': {
        if (payment.targetId) {
          await tx.sellerSubscription.create({
            data: {
              userId: payment.userId,
              planId: payment.targetId,
              expiresAt: addDays(30),
              active: true,
            },
          });
        }
        break;
      }
      case 'FEATURED': {
        await tx.sellerProfile.upsert({
          where: { userId: payment.userId },
          create: { userId: payment.userId, isFeatured: true, featuredUntil: addDays(FEATURED_DAYS) },
          update: { isFeatured: true, featuredUntil: addDays(FEATURED_DAYS) },
        });
        break;
      }
      case 'VERIFICATION': {
        // Unlock the request for admin review (fee gate). requestId is carried in metadata.
        const requestId = typeof meta.requestId === 'string' ? meta.requestId : null;
        if (requestId) {
          await tx.verificationRequest.updateMany({
            where: { id: requestId, userId: payment.userId, status: 'PENDING' },
            data: { feePaid: true },
          });
        }
        break;
      }
    }
  });

  // Post-commit side effects.
  if (payment.purpose === 'PROMOTION' && payment.targetId) {
    await enqueueListingSync(payment.targetId); // refresh search doc with promo boost
  }
  await writeAudit({
    actorId: payment.userId,
    action: 'payment.success',
    targetType: 'Payment',
    targetId: payment.id,
    after: { purpose: payment.purpose, amountKobo: payment.amountKobo, reference },
  });
  await notify(payment.userId, 'payment.success', { purpose: payment.purpose, reference });
  void emailUser(
    payment.userId,
    'Payment received on Lumo',
    `<p>We received your payment of ₦${(payment.amountKobo / 100).toLocaleString('en-NG')} for ${payment.purpose.toLowerCase()}.</p>`,
  );
}

// Re-verify stale PENDING payments against Paystack (catches missed webhooks, TRD §14).
export async function reconcilePendingPayments(): Promise<{
  checked: number;
  fulfilled: number;
  failed: number;
}> {
  if (!isPaystackConfigured) return { checked: 0, fulfilled: 0, failed: 0 };

  const pendings = await prisma.payment.findMany({
    where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - PAYMENT_STALE_MS) } },
    take: 100,
  });

  let fulfilled = 0;
  let failed = 0;
  for (const p of pendings) {
    try {
      const v = await verifyTransaction(p.reference);
      if (v.status === 'success') {
        await fulfillPayment(p.reference, v.amountKobo);
        fulfilled++;
      } else if (v.status === 'failed' || v.status === 'abandoned') {
        await prisma.payment.update({
          where: { reference: p.reference },
          data: { status: v.status === 'failed' ? 'FAILED' : 'ABANDONED' },
        });
        failed++;
      }
    } catch (err) {
      logger.warn({ err, reference: p.reference }, 'Reconcile verify failed — leaving PENDING');
    }
  }
  logger.info({ checked: pendings.length, fulfilled, failed }, 'Payment reconciliation complete');
  return { checked: pendings.length, fulfilled, failed };
}

function toPaymentDTO(p: Payment): PaymentDTO {
  return {
    id: p.id,
    purpose: p.purpose,
    amountKobo: p.amountKobo,
    status: p.status,
    reference: p.reference,
    targetId: p.targetId,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function listMyPayments(userId: string): Promise<PaymentDTO[]> {
  const rows = await prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  return rows.map(toPaymentDTO);
}

export async function listPaymentsForAdmin(status?: PaymentStatus): Promise<PaymentDTO[]> {
  const rows = await prisma.payment.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return rows.map(toPaymentDTO);
}
