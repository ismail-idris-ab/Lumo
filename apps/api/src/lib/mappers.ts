import type { User } from '@prisma/client';
import type { PublicUser } from '@lumo/shared';

// Strip sensitive fields (passwordHash, deletedAt) → public-safe user DTO.
export function toPublicUser(u: User, bio?: string | null): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    roles: u.roles,
    emailVerified: u.emailVerified,
    phoneVerified: u.phoneVerified,
    avatarUrl: u.avatarUrl,
    bio: bio ?? null,
    state: u.state ?? null,
    city: u.city ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}
