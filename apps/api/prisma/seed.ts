import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// MVP categories (PRD §8).
const categories = [
  { name: 'Phones & Tablets', slug: 'phones-tablets', order: 1 },
  { name: 'Electronics', slug: 'electronics', order: 2 },
  { name: 'Vehicles', slug: 'vehicles', order: 3 },
  { name: 'Property', slug: 'property', order: 4 },
  { name: 'Services', slug: 'services', order: 5 },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, order: c.order },
      create: c,
    });
  }
  console.log(`Seeded ${categories.length} categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
