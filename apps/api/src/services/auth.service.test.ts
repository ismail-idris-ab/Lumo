import { describe, it, expect, vi, beforeEach } from 'vitest';

// Rotating-refresh reuse detection is the security spine of the session model (TRD §7):
// presenting an already-rotated or revoked token must revoke the WHOLE family, never mint a
// new session. DB-free — Prisma is mocked; the token hashing/signing primitives are real.

const { refreshToken } = vi.hoisted(() => ({
  refreshToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}));

vi.mock('../lib/prisma', () => ({ prisma: { refreshToken } }));
vi.mock('../lib/mappers', () => ({ toPublicUser: (u: { id: string }) => ({ id: u.id }) }));

import { refresh, logout } from './auth.service';

const ctx = { userAgent: 'vitest', ip: '127.0.0.1' };
const futureDate = new Date(Date.now() + 60_000);
const user = { id: 'user_1', roles: ['BUYER'], deletedAt: null };

// A live (rotatable) refresh row: not replaced, not revoked, not expired.
function liveRow(overrides = {}) {
  return {
    id: 'rt_1',
    userId: user.id,
    familyId: 'fam_1',
    replacedById: null,
    revokedAt: null,
    expiresAt: futureDate,
    user,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('refresh — reuse detection + rotation', () => {
  it('throws 401 when no token is presented', async () => {
    await expect(refresh(undefined, ctx)).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshToken.findUnique).not.toHaveBeenCalled();
  });

  it('throws 401 for an unknown token', async () => {
    refreshToken.findUnique.mockResolvedValue(null);
    await expect(refresh('raw', ctx)).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('revokes the whole family when an already-rotated token is replayed (replacedById set)', async () => {
    refreshToken.findUnique.mockResolvedValue(liveRow({ replacedById: 'rt_2' }));

    await expect(refresh('raw', ctx)).rejects.toMatchObject({ statusCode: 401 });

    expect(refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'fam_1', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
    expect(refreshToken.create).not.toHaveBeenCalled(); // no new session minted
  });

  it('revokes the whole family when a revoked token is replayed (revokedAt set)', async () => {
    refreshToken.findUnique.mockResolvedValue(liveRow({ revokedAt: new Date() }));
    await expect(refresh('raw', ctx)).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshToken.updateMany).toHaveBeenCalled();
    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('throws 401 for an expired token without rotating', async () => {
    refreshToken.findUnique.mockResolvedValue(liveRow({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(refresh('raw', ctx)).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('throws 401 when the owning user is soft-deleted', async () => {
    refreshToken.findUnique.mockResolvedValue(liveRow({ user: { ...user, deletedAt: new Date() } }));
    await expect(refresh('raw', ctx)).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('rotates a valid token: mints a new one in the same family and links old → new', async () => {
    refreshToken.findUnique.mockResolvedValue(liveRow());
    refreshToken.create.mockResolvedValue({ id: 'rt_new' });

    const result = await refresh('raw', ctx);

    // New token created in the SAME family.
    expect(refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ familyId: 'fam_1', userId: 'user_1' }) }),
    );
    // Old token revoked + linked to the replacement (the reuse tripwire).
    expect(refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rt_1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date), replacedById: 'rt_new' }),
      }),
    );
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toEqual({ id: 'user_1' });
    // The returned raw refresh token is the new one, never the presented one.
    expect(result.refreshToken).not.toBe('raw');
  });
});

describe('logout', () => {
  it('is a no-op when no token is presented', async () => {
    await logout(undefined);
    expect(refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('revokes the presented token if still active', async () => {
    await logout('raw');
    expect(refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
    );
  });
});
