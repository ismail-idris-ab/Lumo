import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getAdminAnalytics } from '../../services/analytics.service';

// Mounted under /api/v1/admin/analytics (admin-guarded) — platform overview (PRD §20.20).
export const adminAnalyticsRouter: Router = Router();

adminAnalyticsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getAdminAnalytics());
  }),
);
