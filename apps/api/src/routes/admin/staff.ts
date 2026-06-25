import { Router } from 'express';
import { staffRoleActionSchema, staffEmailQuerySchema } from '@lumo/shared';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireRoles } from '../../middleware/rbac';
import { actorFrom, param } from '../../lib/request';
import * as staff from '../../services/staff.service';

// Mounted under /api/v1/admin/staff. Role management is SUPER_ADMIN-only — stricter than the
// ADMIN-or-SUPER_ADMIN gate applied to the rest of /admin/* in admin/index.ts.
export const adminStaffRouter: Router = Router();
adminStaffRouter.use(requireRoles('SUPER_ADMIN'));

adminStaffRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ staff: await staff.listStaff() });
  }),
);

adminStaffRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { email } = staffEmailQuerySchema.parse(req.query);
    res.json({ user: await staff.findUserByEmail(email) });
  }),
);

adminStaffRouter.post(
  '/:userId/grant',
  asyncHandler(async (req, res) => {
    const { role } = staffRoleActionSchema.parse(req.body);
    res.json({ user: await staff.setStaffRole(param(req, 'userId'), role, true, actorFrom(req)) });
  }),
);

adminStaffRouter.post(
  '/:userId/revoke',
  asyncHandler(async (req, res) => {
    const { role } = staffRoleActionSchema.parse(req.body);
    res.json({ user: await staff.setStaffRole(param(req, 'userId'), role, false, actorFrom(req)) });
  }),
);
