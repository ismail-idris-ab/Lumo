import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as categoryService from '../services/category.service';

export const categoriesRouter: Router = Router();

// GET /api/v1/categories  (?tree=true for nested) — public.
categoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const categories =
      req.query.tree === 'true'
        ? await categoryService.listCategoryTree()
        : await categoryService.listCategories();
    res.json({ categories });
  }),
);
