import type { Response } from 'express';
import ms from 'ms';
import { config } from '../config/env';

export const REFRESH_COOKIE = 'lumo_refresh';

// Scope the refresh cookie to the auth routes only (refresh + logout live there).
const COOKIE_PATH = '/api/v1/auth';

function baseCookieOptions() {
  // No real COOKIE_DOMAIN configured means api + web aren't on a shared parent
  // domain (e.g. separate Render/Vercel hosts) — the cookie must be host-only
  // and SameSite=None so the browser still sends it on cross-site fetches.
  const hasCustomDomain = config.COOKIE_DOMAIN !== 'localhost';
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: (config.isProd && !hasCustomDomain ? 'none' : 'lax') as 'none' | 'lax',
    domain: hasCustomDomain ? config.COOKIE_DOMAIN : undefined,
    path: COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseCookieOptions(), maxAge: ms(config.REFRESH_TTL) });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, baseCookieOptions());
}
