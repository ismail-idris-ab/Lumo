import type { User } from '@prisma/client';
import type { PublicUser } from '@lumo/shared';

// Strip sensitive fields (passwordHash, deletedAt) → public-safe user DTO.
export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    roles: u.roles,
    emailVerified: u.emailVerified,
    phoneVerified: u.phoneVerified,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt.toISOString(),
  };
}
