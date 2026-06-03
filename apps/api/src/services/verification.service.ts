import type { Prisma } from '@prisma/client';
import {
  applyVerificationSchema,
  reviewVerificationSchema,
  type VerificationDoc,
} from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import {
  createVerificationSignature,
  signedViewUrl,
  type VerificationUploadSignature,
} from '../lib/cloudinary';
import { writeAudit, type Actor } from '../lib/audit';
import { notify } from '../lib/notify';
import { emailUser } from '../lib/email';

export function getDocUploadSignature(userId: string): VerificationUploadSignature {
  return createVerificationSignature(userId);
}

export async function applyForVerification(
  userId: string,
  input: unknown,
): Promise<{ id: string; status: string; feePaid: boolean }> {
  const { businessName, docs } = applyVerificationSchema.parse(input);
  const docsJson = docs as unknown as Prisma.InputJsonValue;

  // One pending request at a time. If it's already PAID it's under review — block.
  // If unpaid, let the seller revise docs and (re)pay the fee.
  const existing = await prisma.verificationRequest.findFirst({
    where: { userId, status: 'PENDING' },
    select: { id: true, feePaid: true },
  });
  if (existing?.feePaid) {
    throw AppError.conflict('You already have a verification request under review');
  }

  const request = existing
    ? await prisma.verificationRequest.update({
        where: { id: existing.id },
        data: { businessName: businessName ?? null, docs: docsJson },
      })
    : await prisma.verificationRequest.create({
        data: {
          userId,
          businessName: businessName ?? null,
          docs: docsJson,
          status: 'PENDING',
        },
      });

  await prisma.sellerProfile.upsert({
    where: { userId },
    create: { userId, verification: 'PENDING' },
    update: { verification: 'PENDING' },
  });

  // Fee is gated: the request becomes reviewable only after a VERIFICATION payment (see payment.service).
  return { id: request.id, status: request.status, feePaid: request.feePaid };
}

// ── Admin review ──

export async function listVerificationRequests(status: 'PENDING' | 'VERIFIED' | 'REJECTED' = 'PENDING') {
  const requests = await prisma.verificationRequest.findMany({
    // Gate: only fee-paid requests reach the review queue (unpaid PENDING ones are hidden).
    where: { status, ...(status === 'PENDING' ? { feePaid: true } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return requests.map((r) => ({
    id: r.id,
    user: r.user,
    businessName: r.businessName,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    // Private docs → time-limited signed URLs for the admin.
    docs: (r.docs as unknown as VerificationDoc[]).map((d) => ({
      type: d.type,
      viewUrl: signedViewUrl(d.publicId),
    })),
  }));
}

async function loadPending(id: string) {
  const req = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!req) throw AppError.notFound('Verification request not found');
  if (req.status !== 'PENDING') throw AppError.conflict('Request already reviewed');
  return req;
}

export async function approveVerification(id: string, actor: Actor): Promise<{ id: string; status: string }> {
  const req = await loadPending(id);
  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id },
      data: { status: 'VERIFIED', reviewerId: actor.id, reviewedAt: new Date() },
    }),
    prisma.sellerProfile.upsert({
      where: { userId: req.userId },
      create: { userId: req.userId, verification: 'VERIFIED', verifiedAt: new Date() },
      update: { verification: 'VERIFIED', verifiedAt: new Date() },
    }),
  ]);
  await writeAudit({
    actorId: actor.id,
    action: 'verification.approve',
    targetType: 'VerificationRequest',
    targetId: id,
    before: { status: 'PENDING' },
    after: { status: 'VERIFIED' },
    ip: actor.ip,
  });
  await notify(req.userId, 'verification.approved', { requestId: id });
  void emailUser(
    req.userId,
    'You’re verified on Lumo',
    '<p>Your business verification was approved — your Verified badge is now active.</p>',
  );
  return { id, status: 'VERIFIED' };
}

export async function rejectVerification(
  id: string,
  input: unknown,
  actor: Actor,
): Promise<{ id: string; status: string }> {
  const { reason } = reviewVerificationSchema.parse(input);
  const req = await loadPending(id);
  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id },
      data: { status: 'REJECTED', reason, reviewerId: actor.id, reviewedAt: new Date() },
    }),
    prisma.sellerProfile.upsert({
      where: { userId: req.userId },
      create: { userId: req.userId, verification: 'REJECTED' },
      update: { verification: 'REJECTED' },
    }),
  ]);
  await writeAudit({
    actorId: actor.id,
    action: 'verification.reject',
    targetType: 'VerificationRequest',
    targetId: id,
    before: { status: 'PENDING' },
    after: { status: 'REJECTED', reason },
    ip: actor.ip,
  });
  await notify(req.userId, 'verification.rejected', { requestId: id, reason });
  void emailUser(
    req.userId,
    'Your Lumo verification needs attention',
    `<p>Your verification was not approved.</p><p>Reason: ${reason}</p>`,
  );
  return { id, status: 'REJECTED' };
}
