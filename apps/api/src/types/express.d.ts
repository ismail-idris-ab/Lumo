import type { Role } from '@lumo/shared';

// Augment Express Request with the authenticated principal (set by authenticate middleware).
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles: Role[] };
    }
  }
}

export {};
