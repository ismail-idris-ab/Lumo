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
): Promise<{ id: string; status: string }> {
  const { businessName, docs } = applyVerificationSchema.parse(input);

  const existing = await prisma.verificationRequest.findFirst({
    where: { userId, status: 'PENDING' },
    select: { id: true },
  });
  if (existing) throw AppError.conflict('You already have a pending verification request');

  // NOTE: verification fee (Paystack) is gated in Phase 5 — submission is free for now.
  const request = await prisma.verificationRequest.create({
    data: {
      userId,
      businessName: businessName ?? null,
      docs: docs as unknown as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });
  await prisma.sellerProfile.upsert({
    where: { userId },
    create: { userId, verification: 'PENDING' },
    update: { verification: 'PENDING' },
  });

  return { id: request.id, status: request.status };
}

// ── Admin review ──

export async function listVerificationRequests(status: 'PENDING' | 'VERIFIED' | 'REJECTED' = 'PENDING') {
  const requests = await prisma.verificationRequest.findMany({
    where: { status },
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
