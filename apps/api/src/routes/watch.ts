import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { param } from '../lib/request';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const watchRouter: Router = Router({ mergeParams: true });

// GET /api/v1/listings/:id/watch
watchRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const listingId = param(req, 'id');
    const w = await prisma.priceWatch.findUnique({
      where: { userId_listingId: { userId: req.user!.id, listingId } },
    });
    res.json({ watching: !!w, priceKobo: w?.priceKobo });
  }),
);

// POST /api/v1/listings/:id/watch
watchRouter.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const listingId = param(req, 'id');
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true, deletedAt: true, expiresAt: true, priceKobo: true },
    });
    if (!listing || listing.deletedAt || listing.status !== 'APPROVED' || listing.expiresAt < new Date()) {
      throw AppError.notFound('Listing not available');
    }
    const w = await prisma.priceWatch.upsert({
      where: { userId_listingId: { userId: req.user!.id, listingId } },
      create: { userId: req.user!.id, listingId, priceKobo: listing.priceKobo },
      update: {},
    });
    res.status(201).json({ watching: true, priceKobo: w.priceKobo });
  }),
);

// DELETE /api/v1/listings/:id/watch
watchRouter.delete(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const listingId = param(req, 'id');
    await prisma.priceWatch.deleteMany({
      where: { userId: req.user!.id, listingId },
    });
    res.status(204).end();
  }),
);
