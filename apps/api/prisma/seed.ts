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

// Electronics subcategories — nested under the top-level 'electronics' category.
const electronicsSubcategories = [
  { name: 'Laptops & Computers', slug: 'laptops-computers', order: 1, description: 'Laptops, desktops, all-in-one PCs, and complete computer systems — new or used.' },
  { name: 'Audio & Music Equipment', slug: 'audio-music-equipment', order: 2, description: 'Speakers, sound systems, amplifiers, microphones, mixers, and home audio gear.' },
  { name: 'TV & Video Equipment', slug: 'tv-video-equipment', order: 3, description: 'Televisions, projectors, decoders, and DVD/Blu-ray and home-cinema systems.' },
  { name: 'Headphones & Earphones', slug: 'headphones-earphones', order: 4, description: 'Over-ear headphones, earbuds, wireless earphones, and listening accessories.' },
  { name: 'Computer Accessories', slug: 'computer-accessories', order: 5, description: 'Keyboards, mice, webcams, docking stations, cooling pads, and peripherals.' },
  { name: 'Computer Hardware', slug: 'computer-hardware', order: 6, description: 'Internal parts — processors, motherboards, RAM, graphics cards, drives, PSUs.' },
  { name: 'Computer Monitors', slug: 'computer-monitors', order: 7, description: 'Standalone monitors and displays for desktops and workstations.' },
  { name: 'Printers & Scanners', slug: 'printers-scanners', order: 8, description: 'Printers, scanners, copiers, and supplies like ink and toner.' },
  { name: 'Photo & Video Cameras', slug: 'cameras', order: 9, description: 'Digital cameras, camcorders, lenses, drones, tripods, and accessories.' },
  { name: 'Video Game Consoles', slug: 'game-consoles', order: 10, description: 'PlayStation, Xbox, and Nintendo consoles, controllers, and accessories.' },
  { name: 'Video Games', slug: 'video-games', order: 11, description: 'Physical and digital game titles for consoles and PC.' },
  { name: 'Security & Surveillance', slug: 'security-surveillance', order: 12, description: 'CCTV cameras, DVRs, alarms, intercoms, and access-control systems.' },
  { name: 'Networking Products', slug: 'networking-products', order: 13, description: 'Routers, modems, switches, access points, and networking equipment.' },
  { name: 'Power & Accessories', slug: 'power-accessories', order: 14, description: 'Chargers, cables, power banks, batteries, adapters, UPS, and inverter accessories.' },
  { name: 'Smart Home & Wearables', slug: 'smart-home-wearables', order: 15, description: 'Smartwatches, fitness bands, smart speakers, smart bulbs, and connected-home devices.' },
  { name: 'Software', slug: 'software', order: 16, description: 'Operating systems, productivity apps, antivirus, and licensed software.' },
];

// Promotion packages + subscription plans (PRD §15, prices in kobo).
const promotionPackages = [
  { name: 'Promote 7 days', days: 7, priceKobo: 150_000, tier: 'BOOST' as const },
  { name: 'Promote 14 days', days: 14, priceKobo: 250_000, tier: 'TOP' as const },
  { name: 'Promote 30 days', days: 30, priceKobo: 400_000, tier: 'DIAMOND' as const },
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

  const electronics = await prisma.category.findUnique({ where: { slug: 'electronics' } });
  if (!electronics) throw new Error('electronics category missing — seed top-level first');
  for (const sub of electronicsSubcategories) {
    await prisma.category.upsert({
      where: { slug: sub.slug },
      update: { name: sub.name, order: sub.order, description: sub.description, parentId: electronics.id },
      create: { ...sub, parentId: electronics.id },
    });
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
    `Seeded ${categories.length} categories, ${electronicsSubcategories.length} electronics subcategories, ${promotionPackages.length} promo packages, ${subscriptionPlans.length} plans`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
