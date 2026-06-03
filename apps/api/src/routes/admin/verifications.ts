import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { actorFrom, param } from '../../lib/request';
import * as verificationService from '../../services/verification.service';

// Mounted under /api/v1/admin/verifications (admin-guarded).
export const adminVerificationsRouter: Router = Router();

const statusValues = ['PENDING', 'VERIFIED', 'REJECTED'] as const;

adminVerificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const raw = String(req.query.status ?? 'PENDING');
    const status = (statusValues as readonly string[]).includes(raw)
      ? (raw as (typeof statusValues)[number])
      : 'PENDING';
    res.json({ requests: await verificationService.listVerificationRequests(status) });
  }),
);

adminVerificationsRouter.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    res.json(await verificationService.approveVerification(param(req, 'id'), actorFrom(req)));
  }),
);

adminVerificationsRouter.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    res.json(await verificationService.rejectVerification(param(req, 'id'), req.body, actorFrom(req)));
  }),
);
