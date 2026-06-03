import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { param } from '../lib/request';
import * as favoriteService from '../services/favorite.service';

// All favorites routes require login (domain rule 1).
export const favoritesRouter: Router = Router();
favoritesRouter.use(authenticate);

// GET /api/v1/favorites — current user's saved listings.
favoritesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ listings: await favoriteService.listFavorites(req.user!.id) });
  }),
);

// POST /api/v1/favorites/:listingId — save (idempotent).
favoritesRouter.post(
  '/:listingId',
  asyncHandler(async (req, res) => {
    await favoriteService.addFavorite(req.user!.id, param(req, 'listingId'));
    res.status(201).json({ favorited: true });
  }),
);

// DELETE /api/v1/favorites/:listingId — unsave.
favoritesRouter.delete(
  '/:listingId',
  asyncHandler(async (req, res) => {
    await favoriteService.removeFavorite(req.user!.id, param(req, 'listingId'));
    res.status(204).end();
  }),
);
