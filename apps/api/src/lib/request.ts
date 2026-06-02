import type { Request } from 'express';
import type { Actor } from './audit';
import { AppError } from './errors';

// Safe route-param accessor (noUncheckedIndexedAccess makes req.params[x] possibly undefined).
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw AppError.badRequest(`Missing route parameter: ${name}`);
  return value;
}

// Build an audit Actor from an authenticated request.
export function actorFrom(req: Request): Actor {
  return { id: req.user!.id, ip: req.ip };
}
