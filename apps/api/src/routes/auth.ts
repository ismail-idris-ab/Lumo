import { Router, type Request } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from '../lib/cookies';
import * as authService from '../services/auth.service';
import type { SessionContext } from '../services/auth.service';

export const authRouter: Router = Router();

function sessionContext(req: Request): SessionContext {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.register(
      req.body,
      sessionContext(req),
    );
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ user, accessToken });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
      sessionContext(req),
    );
    setRefreshCookie(res, refreshToken);
    res.json({ user, accessToken });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const { user, accessToken, refreshToken } = await authService.refresh(
      raw,
      sessionContext(req),
    );
    setRefreshCookie(res, refreshToken);
    res.json({ user, accessToken });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);
