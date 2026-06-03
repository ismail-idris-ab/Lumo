import type { RequestHandler } from 'express';
import { config } from '../config/env';
import { getRedis } from '../lib/redis';
import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

export interface RateLimitOptions {
  name: string; // bucket name (e.g. 'login')
  windowSec: number;
  max: number;
  by?: 'ip' | 'user'; // default 'ip'
}

// Redis fixed-window limiter (TRD §20). Fail-open: a Redis hiccup never blocks traffic.
export function rateLimit(opts: RateLimitOptions): RequestHandler {
  const { name, windowSec, max, by = 'ip' } = opts;
  return (req, res, next) => {
    const id = by === 'user' ? (req.user?.id ?? req.ip ?? 'anon') : (req.ip ?? 'anon');
    const key = `${config.RATE_LIMIT_REDIS_PREFIX}${name}:${id}`;

    getRedis()
      .incr(key)
      .then(async (count) => {
        if (count === 1) await getRedis().expire(key, windowSec);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
        if (count > max) {
          next(AppError.rateLimited('Too many requests — slow down and try again shortly'));
        } else {
          next();
        }
      })
      .catch((err) => {
        logger.warn({ err, name }, 'Rate limiter unavailable — failing open');
        next();
      });
  };
}
