import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { MessageDTO } from '@lumo/shared';
import { config } from '../config/env';
import { logger } from './logger';
import { prisma } from './prisma';
import { verifyAccessToken } from './tokens';
import { emailUser } from './email';
import { createRedisConnection } from './redis';
import { sendMessage } from '../services/chat.service';

let io: Server | null = null;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function isMember(chatId: string, userId: string): Promise<boolean> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { buyerId: true, sellerId: true },
  });
  return !!chat && (chat.buyerId === userId || chat.sellerId === userId);
}

// Email the recipient only when they have no live socket (offline) — APP_FLOW §9.
async function deliverOffline(chatId: string, body: string, recipientId: string): Promise<void> {
  if (!io) return;
  const sockets = await io.in(`user:${recipientId}`).fetchSockets();
  if (sockets.length > 0) return;
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { listing: { select: { title: true } } },
  });
  const title = chat?.listing.title ?? 'your listing';
  await emailUser(
    recipientId,
    `New message about “${title}” on Lumo`,
    `<p>You have a new message on Lumo:</p><blockquote>${escapeHtml(body)}</blockquote>` +
      `<p><a href="${config.WEB_BASE_URL}/dashboard/messages">Open chat</a></p>`,
  );
}

// Broadcast a message to its chat room + nudge the recipient's personal room.
export function emitMessage(chatId: string, message: MessageDTO, recipientId: string): void {
  if (!io) return;
  io.to(`chat:${chatId}`).emit('message:new', message);
  io.to(`user:${recipientId}`).emit('chat:unread', { chatId });
  void deliverOffline(chatId, message.body, recipientId); // email if recipient offline
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, { cors: { origin: config.corsOrigins, credentials: true } });

  // Cluster-aware io.to(...).emit + fetchSockets() past one API instance — without this,
  // cross-instance messages never deliver and online recipients on other instances look
  // offline (spurious "is offline" emails from deliverOffline). Pub and sub MUST be two
  // distinct connections — the subscriber enters subscriber mode and can't be shared, so
  // this calls createRedisConnection() twice rather than reusing the shared getRedis()
  // singleton or the BullMQ worker connection.
  const pubClient = createRedisConnection();
  const subClient = createRedisConnection();
  io.adapter(createAdapter(pubClient, subClient));

  // JWT auth on connect (TRD §16).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      socket.data.userId = verifyAccessToken(token).sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`); // personal room for unread/notifications

    socket.on('chat:join', async (chatId: string, cb?: (r: unknown) => void) => {
      if (await isMember(chatId, userId)) {
        await socket.join(`chat:${chatId}`);
        cb?.({ ok: true });
      } else {
        cb?.({ ok: false, error: 'forbidden' });
      }
    });

    socket.on('chat:leave', (chatId: string) => void socket.leave(`chat:${chatId}`));

    socket.on(
      'message:send',
      async (payload: { chatId: string; body: string }, cb?: (r: unknown) => void) => {
        try {
          const { message, recipientId } = await sendMessage(userId, payload.chatId, {
            body: payload.body,
          });
          emitMessage(payload.chatId, message, recipientId);
          cb?.({ ok: true, message });
        } catch (err) {
          cb?.({ ok: false, error: (err as Error).message });
        }
      },
    );
  });

  logger.info('💬 Socket.IO ready');
  return io;
}
