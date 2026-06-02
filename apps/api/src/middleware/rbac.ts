import type { RequestHandler } from 'express';
import type { Role } from '@lumo/shared';
import { AppError } from '../lib/errors';

type Principal = { id: string; roles: Role[] };

const ADMIN_ROLES: Role[] = ['ADMIN', 'SUPER_ADMIN'];

export function isAdmin(user: Principal): boolean {
  return user.roles.some((r) => ADMIN_ROLES.includes(r));
}

// RolesGuard — deny-by-default. Use after authenticate.
export function requireRoles(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!req.user.roles.some((r) => allowed.includes(r))) {
      return next(AppError.forbidden('Insufficient role'));
    }
    next();
  };
}

// Ownership check for resource mutations — owner or admin passes, else 403. Throws.
export function assertOwnership(user: Principal | undefined, ownerId: string): void {
  if (!user) throw AppError.unauthorized();
  if (user.id !== ownerId && !isAdmin(user)) {
    throw AppError.forbidden('You do not own this resource');
  }
}
