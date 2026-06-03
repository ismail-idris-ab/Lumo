import { PrismaClient, Role } from '@prisma/client';

// Promote an existing user to ADMIN (or SUPER_ADMIN).
// Usage: pnpm --filter @lumo/api make-admin <email> [ADMIN|SUPER_ADMIN]
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const role = (process.argv[3]?.trim().toUpperCase() ?? 'ADMIN') as Role;

  if (!email) {
    console.error('Usage: pnpm --filter @lumo/api make-admin <email> [ADMIN|SUPER_ADMIN]');
    process.exit(1);
  }
  if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
    console.error(`Invalid role "${role}". Use ADMIN or SUPER_ADMIN.`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, roles: true } });
  if (!user) {
    console.error(`No user found with email ${email}. Register first, then re-run.`);
    process.exit(1);
  }

  if (user.roles.includes(role)) {
    console.log(`${email} already has ${role}.`);
    return;
  }

  const roles = Array.from(new Set([...user.roles, role]));
  await prisma.user.update({ where: { id: user.id }, data: { roles } });
  console.log(`✓ ${email} promoted — roles: ${roles.join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
