import type { Role, StaffMember } from '@lumo/shared';
import { prisma } from '../lib/prisma';
import { writeAudit, type Actor } from '../lib/audit';
import { AppError } from '../lib/errors';

const STAFF_ROLES: Role[] = ['ADMIN', 'SUPER_ADMIN'];

function toStaffMember(u: { id: string; name: string; email: string; roles: string[] }): StaffMember {
  return { id: u.id, name: u.name, email: u.email, roles: u.roles };
}

export async function listStaff(): Promise<StaffMember[]> {
  const users = await prisma.user.findMany({
    where: { roles: { hasSome: STAFF_ROLES } },
    select: { id: true, name: true, email: true, roles: true },
    orderBy: { name: 'asc' },
  });
  return users.map(toStaffMember);
}

export async function findUserByEmail(email: string): Promise<StaffMember | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, roles: true },
  });
  return user ? toStaffMember(user) : null;
}

export async function setStaffRole(
  targetUserId: string,
  role: 'ADMIN' | 'SUPER_ADMIN',
  grant: boolean,
  actor: Actor,
): Promise<StaffMember> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true, roles: true },
  });
  if (!target) throw AppError.notFound('User not found');

  const hasRole = target.roles.includes(role);
  if (grant === hasRole) return toStaffMember(target);

  if (!grant && role === 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({ where: { roles: { has: 'SUPER_ADMIN' } } });
    if (superAdminCount <= 1) {
      throw AppError.conflict('Cannot remove the last SUPER_ADMIN');
    }
  }

  const roles = grant
    ? [...target.roles, role]
    : target.roles.filter((r) => r !== role);

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { roles },
    select: { id: true, name: true, email: true, roles: true },
  });

  await writeAudit({
    actorId: actor.id,
    action: grant ? 'user.role_grant' : 'user.role_revoke',
    targetType: 'User',
    targetId: targetUserId,
    before: { roles: target.roles },
    after: { roles: updated.roles, role },
    ip: actor.ip,
  });

  return toStaffMember(updated);
}
