import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireRoles } from '../../middleware/rbac';
import { actorFrom } from '../../lib/request';
import { AppError } from '../../lib/errors';
import { grantEarlyAdopterBenefits } from '../../services/growth.service';

// Mounted under /api/v1/admin/growth. One-off campaign tooling — SUPER_ADMIN-only
// (grants free money-equivalent benefits: promotion + verification fee waiver).
export const adminGrowthRouter: Router = Router();

adminGrowthRouter.use(requireRoles('SUPER_ADMIN'));

const tierValues = ['BOOST', 'TOP', 'DIAMOND', 'ENTERPRISE'] as const;

adminGrowthRouter.post(
  '/early-adopters',
  asyncHandler(async (req, res) => {
    const count = Number(req.body?.count);
    const promoDays = Number(req.body?.promoDays);
    const promotionTier = req.body?.promotionTier;
    if (!(tierValues as readonly string[]).includes(promotionTier)) {
      throw AppError.badRequest(`promotionTier must be one of ${tierValues.join(', ')}`);
    }
    res.json(
      await grantEarlyAdopterBenefits(
        count,
        promoDays,
        promotionTier as (typeof tierValues)[number],
        actorFrom(req),
      ),
    );
  }),
);
