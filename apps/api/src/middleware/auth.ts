import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';
import { prisma } from '../lib/prisma';
import { getRedis } from '../lib/redis';

const PRESENCE_TTL_SEC = 300;

// Best-effort presence: throttle the lastActiveAt write to at most once per user per
// PRESENCE_TTL_SEC window via a Redis NX lock, instead of writing the hot users row on
// every single authenticated request.
export async function touchLastActive(userId: string): Promise<void> {
  try {
    const redis = getRedis();
    // ioredis: SET ... NX resolves 'OK' only when the key was absent (first hit this window).
    const fresh = await redis.set(`presence:${userId}`, '1', 'EX', PRESENCE_TTL_SEC, 'NX');
    if (fresh) {
      await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
    }
  } catch {
    // Redis down — skip the write rather than falling back to writing every request.
  }
}

// Require a valid Bearer access token; attaches req.user.
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized());
  }
  const token = header.slice('Bearer '.length).trim();
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }
  req.user = { id: payload.sub, roles: payload.roles };
  next();
  // Fire-and-forget: never block the request on presence tracking.
  void touchLastActive(payload.sub);
};
