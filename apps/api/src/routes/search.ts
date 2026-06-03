import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { searchListings } from '../services/search.service';

export const searchRouter: Router = Router();

// GET /api/v1/search — public full-text search + filters (Meili, Postgres fallback).
searchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await searchListings(req.query));
  }),
);
