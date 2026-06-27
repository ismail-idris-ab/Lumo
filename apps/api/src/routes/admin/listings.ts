import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { actorFrom, param } from '../../lib/request';
import * as moderation from '../../services/moderation.service';

// Mounted under /api/v1/admin/listings (admin-guarded in admin/index.ts).
export const adminListingsRouter: Router = Router();

adminListingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await moderation.listListingsForAdmin(req.query));
  }),
);

adminListingsRouter.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    res.json({ listing: await moderation.approveListing(param(req, 'id'), actorFrom(req)) });
  }),
);

adminListingsRouter.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    res.json({ listing: await moderation.rejectListing(param(req, 'id'), req.body, actorFrom(req)) });
  }),
);

adminListingsRouter.post(
  '/:id/request-changes',
  asyncHandler(async (req, res) => {
    res.json({ listing: await moderation.requestChanges(param(req, 'id'), req.body, actorFrom(req)) });
  }),
);

adminListingsRouter.post(
  '/:id/suspend',
  asyncHandler(async (req, res) => {
    res.json({ listing: await moderation.suspendListing(param(req, 'id'), req.body, actorFrom(req)) });
  }),
);

adminListingsRouter.post(
  '/:id/promote',
  asyncHandler(async (req, res) => {
    res.json({ listing: await moderation.promoteListing(param(req, 'id'), req.body, actorFrom(req)) });
  }),
);

adminListingsRouter.post(
  '/:id/flag',
  asyncHandler(async (req, res) => {
    res.json({ listing: await moderation.flagListing(param(req, 'id'), actorFrom(req)) });
  }),
);

// GET /api/v1/admin/listings/review-queue — PENDING listings + OPEN post-publish reviews.
adminListingsRouter.get(
  '/review-queue',
  asyncHandler(async (_req, res) => {
    res.json({ items: await moderation.listReviewQueue() });
  }),
);

adminListingsRouter.post(
  '/reviews/:reviewId/clear',
  asyncHandler(async (req, res) => {
    await moderation.clearReview(param(req, 'reviewId'), actorFrom(req));
    res.status(204).end();
  }),
);

adminListingsRouter.post(
  '/reviews/:reviewId/action',
  asyncHandler(async (req, res) => {
    const listing = await moderation.actionReview(
      param(req, 'reviewId'),
      req.body.action,
      req.body,
      actorFrom(req),
    );
    res.json({ listing });
  }),
);

adminListingsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await moderation.adminDeleteListing(param(req, 'id'), actorFrom(req));
    res.status(204).end();
  }),
);
