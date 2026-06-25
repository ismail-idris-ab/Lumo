import { describe, it, expect, vi, beforeEach } from 'vitest';

const { user, writeAudit } = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
  writeAudit: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({ prisma: { user } }));
vi.mock('../lib/audit', () => ({ writeAudit }));

import { setStaffRole, findUserByEmail, listStaff } from './staff.service';

const actor = { id: 'super_1', ip: '127.0.0.1' };

beforeEach(() => vi.clearAllMocks());

describe('setStaffRole', () => {
  it('grants a role not currently held and writes an audit log', async () => {
    user.findUnique.mockResolvedValue({ id: 'u1', name: 'Bayo', email: 'bayo@lumo.test', roles: ['BUYER', 'SELLER'] });
    user.update.mockResolvedValue({ id: 'u1', name: 'Bayo', email: 'bayo@lumo.test', roles: ['BUYER', 'SELLER', 'ADMIN'] });

    const result = await setStaffRole('u1', 'ADMIN', true, actor);

    expect(result.roles).toContain('ADMIN');
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { roles: ['BUYER', 'SELLER', 'ADMIN'] },
      select: { id: true, name: true, email: true, roles: true },
    });
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.role_grant', actorId: 'super_1' }));
  });

  it('revokes a role currently held', async () => {
    user.findUnique.mockResolvedValue({ id: 'u1', name: 'Bayo', email: 'bayo@lumo.test', roles: ['BUYER', 'ADMIN'] });
    user.update.mockResolvedValue({ id: 'u1', name: 'Bayo', email: 'bayo@lumo.test', roles: ['BUYER'] });

    await setStaffRole('u1', 'ADMIN', false, actor);

    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { roles: ['BUYER'] },
      select: { id: true, name: true, email: true, roles: true },
    });
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.role_revoke' }));
  });

  it('is a no-op when granting a role already held', async () => {
    user.findUnique.mockResolvedValue({ id: 'u1', name: 'Bayo', email: 'bayo@lumo.test', roles: ['ADMIN'] });

    await setStaffRole('u1', 'ADMIN', true, actor);

    expect(user.update).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it('throws 404 for a non-existent user', async () => {
    user.findUnique.mockResolvedValue(null);
    await expect(setStaffRole('ghost', 'ADMIN', true, actor)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuses to revoke SUPER_ADMIN from the last remaining SUPER_ADMIN', async () => {
    user.findUnique.mockResolvedValue({ id: 'u1', name: 'Founder', email: 'founder@lumo.test', roles: ['SUPER_ADMIN'] });
    user.count.mockResolvedValue(1);

    await expect(setStaffRole('u1', 'SUPER_ADMIN', false, actor)).rejects.toMatchObject({ statusCode: 409 });
    expect(user.update).not.toHaveBeenCalled();
  });

  it('allows revoking SUPER_ADMIN when another SUPER_ADMIN remains', async () => {
    user.findUnique.mockResolvedValue({ id: 'u1', name: 'Founder', email: 'founder@lumo.test', roles: ['SUPER_ADMIN'] });
    user.count.mockResolvedValue(2);
    user.update.mockResolvedValue({ id: 'u1', name: 'Founder', email: 'founder@lumo.test', roles: [] });

    await setStaffRole('u1', 'SUPER_ADMIN', false, actor);
    expect(user.update).toHaveBeenCalled();
  });
});

describe('findUserByEmail', () => {
  it('lowercases and trims before lookup', async () => {
    user.findUnique.mockResolvedValue(null);
    await findUserByEmail('  Bayo@Lumo.Test  ');
    expect(user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'bayo@lumo.test' } }));
  });
});

describe('listStaff', () => {
  it('queries users with ADMIN or SUPER_ADMIN roles', async () => {
    user.findMany.mockResolvedValue([]);
    await listStaff();
    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { roles: { hasSome: ['ADMIN', 'SUPER_ADMIN'] } } }),
    );
  });
});
