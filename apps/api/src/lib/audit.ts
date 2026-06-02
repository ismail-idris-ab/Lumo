import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface Actor {
  id: string;
  ip?: string;
}

export interface AuditInput {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

// Serialize arbitrary objects (incl. Dates) to plain JSON for the immutable audit log.
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function writeAudit(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: toJson(input.before),
      after: toJson(input.after),
      ip: input.ip,
    },
  });
}
