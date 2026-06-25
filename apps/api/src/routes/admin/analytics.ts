import { Router } from 'express';
import { adminRevenueQuerySchema, adminModeratorActivityQuerySchema } from '@lumo/shared';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getAdminAnalytics, getRevenueSeries, getModeratorActivity } from '../../services/analytics.service';

const DAY_MS = 86_400_000;

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

// GET /api/v1/admin/analytics/moderators?from=&to= — per-moderator action counts, for paying
// staff by work done. Defaults to the last 30 days.
adminAnalyticsRouter.get(
  '/moderators',
  asyncHandler(async (req, res) => {
    const { from, to } = adminModeratorActivityQuerySchema.parse(req.query);
    const now = new Date();
    const rangeTo = to ?? now;
    const rangeFrom = from ?? new Date(rangeTo.getTime() - 30 * DAY_MS);
    res.json({ from: rangeFrom, to: rangeTo, moderators: await getModeratorActivity(rangeFrom, rangeTo) });
  }),
);
