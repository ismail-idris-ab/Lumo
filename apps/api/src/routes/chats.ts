import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { rateLimit } from '../middleware/ratelimit';
import { param } from '../lib/request';
import { emitMessage } from '../lib/realtime';
import * as chatService from '../services/chat.service';

// All chat routes require login (domain rule 1).
export const chatsRouter: Router = Router();
chatsRouter.use(authenticate);

// POST /api/v1/chats — get-or-create a chat for a listing.
chatsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const chat = await chatService.getOrCreateChat(req.user!.id, req.body);
    res.status(201).json({ chat });
  }),
);

// GET /api/v1/chats — current user's threads with unread counts.
chatsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ chats: await chatService.listChats(req.user!.id) });
  }),
);

// GET /api/v1/chats/:id/messages — thread messages (marks incoming as read).
chatsRouter.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    res.json({ messages: await chatService.getMessages(req.user!.id, param(req, 'id')) });
  }),
);

// POST /api/v1/chats/:id/messages — send a message (rate-limited 30/min/user).
chatsRouter.post(
  '/:id/messages',
  rateLimit({ name: 'messages', windowSec: 60, max: 30, by: 'user' }),
  asyncHandler(async (req, res) => {
    const { message, recipientId } = await chatService.sendMessage(
      req.user!.id,
      param(req, 'id'),
      req.body,
    );
    emitMessage(param(req, 'id'), message, recipientId); // broadcast to connected clients
    res.status(201).json({ message });
  }),
);
