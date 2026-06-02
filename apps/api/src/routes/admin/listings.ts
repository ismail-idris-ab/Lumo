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
  '/:id/flag',
  asyncHandler(async (req, res) => {
    res.json({ listing: await moderation.flagListing(param(req, 'id'), actorFrom(req)) });
  }),
);

adminListingsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await moderation.adminDeleteListing(param(req, 'id'), actorFrom(req));
    res.status(204).end();
  }),
);
