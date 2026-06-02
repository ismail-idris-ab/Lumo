import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { adminCategoriesRouter } from './categories';
import { adminListingsRouter } from './listings';

// All /api/v1/admin/* routes require an authenticated ADMIN or SUPER_ADMIN (deny-by-default).
export const adminRouter: Router = Router();

adminRouter.use(authenticate, requireRoles('ADMIN', 'SUPER_ADMIN'));

adminRouter.use('/categories', adminCategoriesRouter);
adminRouter.use('/listings', adminListingsRouter);
