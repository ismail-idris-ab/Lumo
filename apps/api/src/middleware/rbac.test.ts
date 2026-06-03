import { describe, it, expect } from 'vitest';
import type { Role } from '@lumo/shared';
import { assertOwnership, isAdmin, requireRoles } from './rbac';
import { AppError } from '../lib/errors';

const buyer = { id: 'u1', roles: ['BUYER'] as Role[] };
const otherBuyer = { id: 'u2', roles: ['BUYER'] as Role[] };
const admin = { id: 'a1', roles: ['ADMIN'] as Role[] };

describe('isAdmin', () => {
  it('is true for ADMIN and SUPER_ADMIN', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin({ id: 's1', roles: ['SUPER_ADMIN'] })).toBe(true);
  });
  it('is false for a plain buyer/seller', () => {
    expect(isAdmin(buyer)).toBe(false);
    expect(isAdmin({ id: 's2', roles: ['SELLER'] })).toBe(false);
  });
});

describe('assertOwnership', () => {
  it('passes for the resource owner', () => {
    expect(() => assertOwnership(buyer, 'u1')).not.toThrow();
  });
  it('passes for an admin on someone else’s resource', () => {
    expect(() => assertOwnership(admin, 'u1')).not.toThrow();
  });
  it('throws 403 for a non-owner non-admin', () => {
    expect(() => assertOwnership(otherBuyer, 'u1')).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
  it('throws 401 when there is no user', () => {
    expect(() => assertOwnership(undefined, 'u1')).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
});

describe('requireRoles', () => {
  const run = (user: unknown) => {
    let err: unknown;
    // Minimal Express req/next doubles.
    requireRoles('ADMIN', 'SUPER_ADMIN')({ user } as never, {} as never, ((e?: unknown) => {
      err = e;
    }) as never);
    return err;
  };

  it('calls next() with no error for an allowed role', () => {
    expect(run(admin)).toBeUndefined();
  });
  it('calls next(403) for a disallowed role', () => {
    expect(run(buyer)).toBeInstanceOf(AppError);
    expect(run(buyer)).toMatchObject({ statusCode: 403 });
  });
  it('calls next(401) when unauthenticated', () => {
    expect(run(undefined)).toMatchObject({ statusCode: 401 });
  });
});
