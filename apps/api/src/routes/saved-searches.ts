import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { param } from '../lib/request';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { createSavedSearchSchema, type SavedSearchDTO } from '@lumo/shared';

export const savedSearchesRouter: Router = Router();

function toDTO(ss: {
  id: string;
  name: string | null;
  query: string | null;
  categoryId: string | null;
  state: string | null;
  minPriceKobo: number | null;
  maxPriceKobo: number | null;
  condition: string | null;
  createdAt: Date;
}): SavedSearchDTO {
  return {
    id: ss.id,
    name: ss.name,
    query: ss.query,
    categoryId: ss.categoryId,
    state: ss.state,
    minPriceKobo: ss.minPriceKobo,
    maxPriceKobo: ss.maxPriceKobo,
    condition: ss.condition as SavedSearchDTO['condition'],
    createdAt: ss.createdAt.toISOString(),
  };
}

// GET /api/v1/me/saved-searches
savedSearchesRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const items = await prisma.savedSearch.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: items.map(toDTO) });
  }),
);

// POST /api/v1/me/saved-searches
savedSearchesRouter.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = createSavedSearchSchema.parse(req.body);
    const ss = await prisma.savedSearch.create({
      data: { ...data, userId: req.user!.id },
    });
    res.status(201).json({ savedSearch: toDTO(ss) });
  }),
);

// DELETE /api/v1/me/saved-searches/:id
savedSearchesRouter.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = param(req, 'id');
    const ss = await prisma.savedSearch.findUnique({ where: { id } });
    if (!ss || ss.userId !== req.user!.id) throw AppError.notFound('Saved search not found');
    await prisma.savedSearch.delete({ where: { id } });
    res.status(204).end();
  }),
);
