import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Wrap async route handlers so rejected promises reach the error middleware
// (Express 4 does not forward async errors automatically).
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
