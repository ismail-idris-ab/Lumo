import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';

export const subscriptionsRouter: Router = Router();

// GET /api/v1/subscriptions/plans — public.
subscriptionsRouter.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    res.json({
      plans: await prisma.subscriptionPlan.findMany({
        where: { active: true },
        orderBy: { priceKobo: 'asc' },
      }),
    });
  }),
);
