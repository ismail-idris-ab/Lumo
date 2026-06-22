import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { emitToUser } from './realtime';

// Persist an in-app notification row and push it live to the user's socket room
// (apps/web's NotificationBell listens for 'notification:new') — falls back to the
// bell's poll if the user has no live socket.
export async function notify(userId: string, type: string, payload: Prisma.InputJsonValue) {
  const created = await prisma.notification.create({ data: { userId, type, payload } });
  emitToUser(userId, 'notification:new', {
    id: created.id,
    type: created.type,
    payload: created.payload,
    readAt: created.readAt?.toISOString() ?? null,
    createdAt: created.createdAt.toISOString(),
  });
  return created;
}
