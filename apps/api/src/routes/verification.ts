import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as verificationService from '../services/verification.service';

// Login-gated seller verification (TRD §22, APP_FLOW §18).
export const verificationRouter: Router = Router();
verificationRouter.use(authenticate);

// POST /api/v1/verification/docs/sign — signed params for a PRIVATE doc upload.
verificationRouter.post(
  '/docs/sign',
  asyncHandler(async (req, res) => {
    res.json(verificationService.getDocUploadSignature(req.user!.id));
  }),
);

// POST /api/v1/verification/apply — submit docs → PENDING review.
verificationRouter.post(
  '/apply',
  asyncHandler(async (req, res) => {
    const request = await verificationService.applyForVerification(req.user!.id, req.body);
    res.status(201).json({ request });
  }),
);
