import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { actorFrom, param } from '../../lib/request';
import * as categoryService from '../../services/category.service';

// Mounted under /api/v1/admin/categories (admin-guarded in admin/index.ts).
export const adminCategoriesRouter: Router = Router();

adminCategoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const category = await categoryService.createCategory(req.body, actorFrom(req));
    res.status(201).json({ category });
  }),
);

adminCategoriesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await categoryService.updateCategory(param(req, 'id'), req.body, actorFrom(req));
    res.json({ category });
  }),
);

adminCategoriesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await categoryService.deleteCategory(param(req, 'id'), actorFrom(req));
    res.status(204).end();
  }),
);
