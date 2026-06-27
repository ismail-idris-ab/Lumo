import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { adminCategoriesRouter } from './categories';
import { adminListingsRouter } from './listings';
import { adminReportsRouter } from './reports';
import { adminVerificationsRouter } from './verifications';
import { adminPaymentsRouter } from './payments';
import { adminAnalyticsRouter } from './analytics';
import { adminStaffRouter } from './staff';
import { adminApplicationsRouter } from './applications';
import { adminGrowthRouter } from './growth';

// All /api/v1/admin/* routes require an authenticated ADMIN or SUPER_ADMIN (deny-by-default).
export const adminRouter: Router = Router();

adminRouter.use(authenticate, requireRoles('ADMIN', 'SUPER_ADMIN'));

adminRouter.use('/categories', adminCategoriesRouter);
adminRouter.use('/listings', adminListingsRouter);
adminRouter.use('/reports', adminReportsRouter);
adminRouter.use('/verifications', adminVerificationsRouter);
adminRouter.use('/payments', adminPaymentsRouter);
adminRouter.use('/analytics', adminAnalyticsRouter);
adminRouter.use('/staff', adminStaffRouter);
adminRouter.use('/applications', adminApplicationsRouter);
adminRouter.use('/growth', adminGrowthRouter);
