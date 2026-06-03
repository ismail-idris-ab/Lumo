import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { rateLimit } from '../middleware/ratelimit';
import { createReport } from '../services/report.service';

export const reportsRouter: Router = Router();

// POST /api/v1/reports — report a listing (login + 10/day/user, deduped).
reportsRouter.post(
  '/',
  authenticate,
  rateLimit({ name: 'reports', windowSec: 86_400, max: 10, by: 'user' }),
  asyncHandler(async (req, res) => {
    await createReport(req.user!.id, req.body);
    res.status(201).json({ reported: true });
  }),
);
