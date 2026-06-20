import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';
import { prisma } from '../lib/prisma';

// Require a valid Bearer access token; attaches req.user.
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized());
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, roles: payload.roles };
    // Fire-and-forget: track last active time without blocking the request.
    void prisma.user
      .update({ where: { id: payload.sub }, data: { lastActiveAt: new Date() } })
      .catch(() => {});
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
};
