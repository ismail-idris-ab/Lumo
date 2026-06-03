import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { rateLimit } from '../middleware/ratelimit';
import { param } from '../lib/request';
import * as listingService from '../services/listing.service';
import * as imageService from '../services/image.service';

export const listingsRouter: Router = Router();

// GET /api/v1/listings — public browse (filters/sort/pagination).
listingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await listingService.listPublicListings(req.query));
  }),
);

// GET /api/v1/listings/mine — current user's listings (any status). Must precede /:slug.
listingsRouter.get(
  '/mine',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ listings: await listingService.listMyListings(req.user!.id) });
  }),
);

// GET /api/v1/listings/:slug — public detail (APPROVED + non-expired only).
listingsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    res.json({ listing: await listingService.getListingBySlug(param(req, 'slug')) });
  }),
);

// POST /api/v1/listings — create (→ PENDING). Login required.
listingsRouter.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const listing = await listingService.createListing(req.body, req.user!.id);
    res.status(201).json({ listing });
  }),
);

// PATCH /api/v1/listings/:id — owner edit (material edit → re-PENDING).
listingsRouter.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const listing = await listingService.updateListing(param(req, 'id'), req.body, req.user!);
    res.json({ listing });
  }),
);

// DELETE /api/v1/listings/:id — owner soft-delete.
listingsRouter.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await listingService.deleteListing(param(req, 'id'), req.user!);
    res.status(204).end();
  }),
);

// POST /api/v1/listings/:id/sold — owner marks sold.
listingsRouter.post(
  '/:id/sold',
  authenticate,
  asyncHandler(async (req, res) => {
    const listing = await listingService.markListingSold(param(req, 'id'), req.user!);
    res.json({ listing });
  }),
);

// POST /api/v1/listings/:id/contact-reveal — reveal seller phone (login + rate-limited).
listingsRouter.post(
  '/:id/contact-reveal',
  authenticate,
  rateLimit({ name: 'contact-reveal', windowSec: 3600, max: 20, by: 'user' }),
  asyncHandler(async (req, res) => {
    res.json(await listingService.revealContact(param(req, 'id'), req.user!.id));
  }),
);

// ── Images (owner-only; signed direct upload to Cloudinary) ──

// POST /api/v1/listings/:id/images/sign — get signed upload params.
listingsRouter.post(
  '/:id/images/sign',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await imageService.getUploadSignature(param(req, 'id'), req.user!));
  }),
);

// POST /api/v1/listings/:id/images — attach an uploaded asset.
listingsRouter.post(
  '/:id/images',
  authenticate,
  asyncHandler(async (req, res) => {
    const images = await imageService.attachImage(param(req, 'id'), req.body, req.user!);
    res.status(201).json({ images });
  }),
);

// POST /api/v1/listings/:id/images/:imageId/primary — set primary image.
listingsRouter.post(
  '/:id/images/:imageId/primary',
  authenticate,
  asyncHandler(async (req, res) => {
    const images = await imageService.setPrimaryImage(param(req, 'id'), param(req, 'imageId'), req.user!);
    res.json({ images });
  }),
);

// DELETE /api/v1/listings/:id/images/:imageId — remove image (+ Cloudinary asset).
listingsRouter.delete(
  '/:id/images/:imageId',
  authenticate,
  asyncHandler(async (req, res) => {
    const images = await imageService.deleteImage(param(req, 'id'), param(req, 'imageId'), req.user!);
    res.json({ images });
  }),
);
