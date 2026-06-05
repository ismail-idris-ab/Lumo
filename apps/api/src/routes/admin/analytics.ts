import { Router } from 'express';
import { adminRevenueQuerySchema } from '@lumo/shared';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getAdminAnalytics, getRevenueSeries } from '../../services/analytics.service';

// Mounted under /api/v1/admin/analytics (admin-guarded) — platform overview (PRD §20.20).
export const adminAnalyticsRouter: Router = Router();

adminAnalyticsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getAdminAnalytics());
  }),
);

// GET /api/v1/admin/analytics/revenue?days=7|30|90 — daily revenue series (defaults to 30).
adminAnalyticsRouter.get(
  '/revenue',
  asyncHandler(async (req, res) => {
    const { days } = adminRevenueQuerySchema.parse(req.query);
    res.json(await getRevenueSeries(days));
  }),
);
