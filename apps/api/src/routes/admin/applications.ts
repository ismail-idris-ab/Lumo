import { Router } from 'express';
import { applicationStatusSchema } from '@lumo/shared';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireRoles } from '../../middleware/rbac';
import { actorFrom, param } from '../../lib/request';
import * as applications from '../../services/staff-application.service';

// Mounted under /api/v1/admin/applications. SUPER_ADMIN-only, same tier as /admin/staff —
// approving an application is the first step toward granting ADMIN.
export const adminApplicationsRouter: Router = Router();
adminApplicationsRouter.use(requireRoles('SUPER_ADMIN'));

const listQuerySchema = z.object({ status: applicationStatusSchema.optional() });

adminApplicationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = listQuerySchema.parse(req.query);
    res.json({ applications: await applications.listApplications(status) });
  }),
);

adminApplicationsRouter.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    res.json({ application: await applications.approveApplication(param(req, 'id'), actorFrom(req)) });
  }),
);

adminApplicationsRouter.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    res.json({ application: await applications.rejectApplication(param(req, 'id'), actorFrom(req)) });
  }),
);
