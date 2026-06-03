import { Router } from 'express';
import { paymentStatusSchema } from '@lumo/shared';
import { asyncHandler } from '../../middleware/asyncHandler';
import { listPaymentsForAdmin } from '../../services/payment.service';

// Mounted under /api/v1/admin/payments (admin-guarded) — revenue/reconciliation view (PRD §17).
export const adminPaymentsRouter: Router = Router();

adminPaymentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = paymentStatusSchema.safeParse(req.query.status);
    res.json({ payments: await listPaymentsForAdmin(parsed.success ? parsed.data : undefined) });
  }),
);
