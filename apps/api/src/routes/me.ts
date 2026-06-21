import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { rateLimit } from '../middleware/ratelimit';
import { prisma } from '../lib/prisma';
import { toPublicUser } from '../lib/mappers';
import { AppError } from '../lib/errors';
import { clearRefreshCookie } from '../lib/cookies';
import { getSellerAnalytics } from '../services/analytics.service';
import { createAvatarUploadSignature } from '../lib/cloudinary';
import * as authService from '../services/auth.service';
import { updateProfileSchema } from '@lumo/shared';

export const meRouter: Router = Router();

// GET /api/v1/me — current authenticated user.
meRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { sellerProfile: { select: { bio: true } } },
    });
    if (!user || user.deletedAt) throw AppError.unauthorized();
    res.json({ user: toPublicUser(user, user.sellerProfile?.bio) });
  }),
);

// PATCH /api/v1/me — update profile fields.
meRouter.patch(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const body = updateProfileSchema.parse(req.body);
    const userId = req.user!.id;

    const { bio, ...userFields } = body;

    // Strip empty strings → null so DB stays clean.
    const userUpdate: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(userFields)) {
      userUpdate[k] = (v as string | undefined)?.trim() || null;
    }

    const [user, profile] = await Promise.all([
      prisma.user.update({ where: { id: userId }, data: userUpdate }),
      bio !== undefined
        ? prisma.sellerProfile.upsert({
            where: { userId },
            update: { bio: bio.trim() || null },
            create: { userId, bio: bio.trim() || null },
          })
        : prisma.sellerProfile.findUnique({ where: { userId }, select: { bio: true } }),
    ]);

    res.json({ user: toPublicUser(user, profile?.bio) });
  }),
);

// POST /api/v1/me/avatar/sign — Cloudinary signed upload params for avatar.
meRouter.post(
  '/avatar/sign',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(createAvatarUploadSignature(req.user!.id));
  }),
);

// GET /api/v1/me/analytics — seller's own listing performance.
meRouter.get(
  '/analytics',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getSellerAnalytics(req.user!.id));
  }),
);

// POST /api/v1/me/password — change password (requires current password).
meRouter.post(
  '/password',
  authenticate,
  rateLimit({ name: 'change-password', windowSec: 60, max: 5 }),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body);
    res.status(204).end();
  }),
);

// PATCH /api/v1/me/email — change email (requires current password).
meRouter.patch(
  '/email',
  authenticate,
  rateLimit({ name: 'change-email', windowSec: 60, max: 5 }),
  asyncHandler(async (req, res) => {
    const user = await authService.changeEmail(req.user!.id, req.body);
    res.json({ user });
  }),
);

// DELETE /api/v1/me — soft-delete account (requires current password).
meRouter.delete(
  '/',
  authenticate,
  rateLimit({ name: 'delete-account', windowSec: 60, max: 5 }),
  asyncHandler(async (req, res) => {
    await authService.deleteAccount(req.user!.id, req.body);
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);
