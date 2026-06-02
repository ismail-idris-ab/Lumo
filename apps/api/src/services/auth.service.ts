import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import { loginSchema, registerSchema, type PublicUser } from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  signAccessToken,
} from '../lib/tokens';
import { toPublicUser } from '../lib/mappers';
import { AppError } from '../lib/errors';

export interface SessionContext {
  userAgent?: string;
  ip?: string;
}

export interface SessionResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string; // raw — caller sets the httpOnly cookie
}

// Mint an access token + persist a new refresh token (optionally continuing a family).
async function issueSession(
  user: User,
  ctx: SessionContext,
  familyId = randomUUID(),
): Promise<SessionResult> {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      familyId,
      expiresAt: refreshExpiryDate(),
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    },
  });
  const accessToken = signAccessToken({ sub: user.id, roles: user.roles });
  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function register(input: unknown, ctx: SessionContext): Promise<SessionResult> {
  const data = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw AppError.conflict('Email already registered');

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      name: data.name,
      phone: data.phone ?? null,
    },
  });
  return issueSession(user, ctx);
}

export async function login(input: unknown, ctx: SessionContext): Promise<SessionResult> {
  const data = loginSchema.parse(input);
  // Generic message — avoid leaking which part failed (user enumeration).
  const invalid = AppError.unauthorized('Invalid email or password');

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || user.deletedAt) throw invalid;
  if (!(await verifyPassword(user.passwordHash, data.password))) throw invalid;

  return issueSession(user, ctx);
}

// Rotating refresh with reuse detection (TRD §7). Presenting an already-rotated or
// revoked token revokes the entire session family.
export async function refresh(rawToken: string | undefined, ctx: SessionContext): Promise<SessionResult> {
  if (!rawToken) throw AppError.unauthorized('Missing refresh token');

  const tokenHash = hashRefreshToken(rawToken);
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!row) throw AppError.unauthorized('Invalid refresh token');

  if (row.replacedById || row.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: row.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw AppError.unauthorized('Refresh token reuse detected — session revoked');
  }
  if (row.expiresAt < new Date()) throw AppError.unauthorized('Refresh token expired');
  if (row.user.deletedAt) throw AppError.unauthorized();

  // Rotate within the same family, linking old → new.
  const newRefresh = generateRefreshToken();
  const created = await prisma.refreshToken.create({
    data: {
      userId: row.userId,
      tokenHash: hashRefreshToken(newRefresh),
      familyId: row.familyId,
      expiresAt: refreshExpiryDate(),
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    },
  });
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date(), replacedById: created.id },
  });

  const accessToken = signAccessToken({ sub: row.user.id, roles: row.user.roles });
  return { user: toPublicUser(row.user), accessToken, refreshToken: newRefresh };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
