import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';

export const healthRouter: Router = Router();

// GET /api/v1/health — liveness + DB reachability.
healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    let db: 'up' | 'down' = 'up';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    res.json({
      status: 'ok',
      db,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }),
);
