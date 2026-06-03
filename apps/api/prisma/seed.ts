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

// Promotion packages + subscription plans (PRD §15, prices in kobo).
const promotionPackages = [
  { name: 'Promote 7 days', days: 7, priceKobo: 150_000 },
  { name: 'Promote 14 days', days: 14, priceKobo: 250_000 },
  { name: 'Promote 30 days', days: 30, priceKobo: 400_000 },
];
const subscriptionPlans = [
  { name: 'Starter', priceKobo: 300_000, listingLimit: 20, promoCredits: 2, features: { badge: false, featured: false } },
  { name: 'Business', priceKobo: 800_000, listingLimit: 100, promoCredits: 10, features: { badge: true, featured: true } },
];

async function upsertByName<T extends { name: string }>(
  find: (name: string) => Promise<{ id: string } | null>,
  create: (data: T) => Promise<unknown>,
  update: (id: string, data: T) => Promise<unknown>,
  rows: T[],
) {
  for (const row of rows) {
    const existing = await find(row.name);
    if (existing) await update(existing.id, row);
    else await create(row);
  }
}

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: { name: c.name, order: c.order }, create: c });
  }

  await upsertByName(
    (name) => prisma.promotionPackage.findFirst({ where: { name }, select: { id: true } }),
    (d) => prisma.promotionPackage.create({ data: d }),
    (id, d) => prisma.promotionPackage.update({ where: { id }, data: d }),
    promotionPackages,
  );

  await upsertByName(
    (name) => prisma.subscriptionPlan.findFirst({ where: { name }, select: { id: true } }),
    (d) => prisma.subscriptionPlan.create({ data: d }),
    (id, d) => prisma.subscriptionPlan.update({ where: { id }, data: d }),
    subscriptionPlans,
  );

  console.log(
    `Seeded ${categories.length} categories, ${promotionPackages.length} promo packages, ${subscriptionPlans.length} plans`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
