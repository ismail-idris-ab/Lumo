import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { param } from '../lib/request';
import * as notificationService from '../services/notification.service';

export const notificationsRouter: Router = Router();
notificationsRouter.use(authenticate);

// GET /api/v1/notifications — list + unread count.
notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await notificationService.listNotifications(req.user!.id));
  }),
);

// POST /api/v1/notifications/read-all
notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user!.id);
    res.status(204).end();
  }),
);

// POST /api/v1/notifications/:id/read
notificationsRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await notificationService.markRead(req.user!.id, param(req, 'id'));
    res.status(204).end();
  }),
);
