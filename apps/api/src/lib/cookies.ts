import type { Response } from 'express';
import ms from 'ms';
import { config } from '../config/env';

export const REFRESH_COOKIE = 'lumo_refresh';

// Scope the refresh cookie to the auth routes only (refresh + logout live there).
const COOKIE_PATH = '/api/v1/auth';

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax' as const,
    domain: config.COOKIE_DOMAIN,
    path: COOKIE_PATH,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseCookieOptions(), maxAge: ms(config.REFRESH_TTL) });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, baseCookieOptions());
}
