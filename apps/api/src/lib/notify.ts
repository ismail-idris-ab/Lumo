import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// Persist an in-app notification row. Delivery (socket/email) is wired in Phase 3 (TRD §17).
export function notify(userId: string, type: string, payload: Prisma.InputJsonValue) {
  return prisma.notification.create({ data: { userId, type, payload } });
}
