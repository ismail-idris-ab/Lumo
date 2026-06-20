import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { toPublicUser } from '../lib/mappers';
import { AppError } from '../lib/errors';
import { getSellerAnalytics } from '../services/analytics.service';
import { createAvatarUploadSignature } from '../lib/cloudinary';
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
