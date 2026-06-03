import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';

export const promotionsRouter: Router = Router();

// GET /api/v1/promotions/packages — public.
promotionsRouter.get(
  '/packages',
  asyncHandler(async (_req, res) => {
    res.json({
      packages: await prisma.promotionPackage.findMany({
        where: { active: true },
        orderBy: { days: 'asc' },
      }),
    });
  }),
);
