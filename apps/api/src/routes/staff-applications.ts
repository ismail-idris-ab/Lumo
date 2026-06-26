import { Router } from 'express';
import { submitStaffApplicationSchema } from '@lumo/shared';
import { asyncHandler } from '../middleware/asyncHandler';
import { rateLimit } from '../middleware/ratelimit';
import { submitApplication } from '../services/staff-application.service';

export const staffApplicationsRouter: Router = Router();

// POST /api/v1/staff-applications — public, no account needed. IP-limited against spam.
staffApplicationsRouter.post(
  '/',
  rateLimit({ name: 'staff-applications', windowSec: 86_400, max: 5 }),
  asyncHandler(async (req, res) => {
    const input = submitStaffApplicationSchema.parse(req.body);
    res.status(201).json({ application: await submitApplication(input) });
  }),
);
