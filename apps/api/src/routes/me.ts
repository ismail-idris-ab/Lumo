import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { toPublicUser } from '../lib/mappers';
import { AppError } from '../lib/errors';

export const meRouter: Router = Router();

// GET /api/v1/me — current authenticated user.
meRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || user.deletedAt) throw AppError.unauthorized();
    res.json({ user: toPublicUser(user) });
  }),
);
