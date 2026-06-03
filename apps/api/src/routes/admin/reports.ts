import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { actorFrom } from '../../lib/request';
import * as reportService from '../../services/report.service';

// Mounted under /api/v1/admin/reports (admin-guarded).
export const adminReportsRouter: Router = Router();

adminReportsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ groups: await reportService.listReportsForAdmin() });
  }),
);

// POST /api/v1/admin/reports/resolve — resolve a listing's reports (+ optional action).
adminReportsRouter.post(
  '/resolve',
  asyncHandler(async (req, res) => {
    res.json(await reportService.resolveReports(actorFrom(req), req.body));
  }),
);
