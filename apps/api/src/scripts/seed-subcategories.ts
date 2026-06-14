import { prisma } from '../lib/prisma';

const SUBCATEGORIES: Record<string, { name: string; slug: string; order: number }[]> = {
  'phones-tablets': [
    { name: 'Smartphones', slug: 'smartphones', order: 1 },
    { name: 'iPhones', slug: 'iphones', order: 2 },
    { name: 'Tablets', slug: 'tablets', order: 3 },
    { name: 'iPads', slug: 'ipads', order: 4 },
    { name: 'Feature Phones', slug: 'feature-phones', order: 5 },
    { name: 'Phone Accessories', slug: 'phone-accessories', order: 6 },
  ],
  'electronics': [
    { name: 'Laptops & Computers', slug: 'laptops-computers', order: 1 },
    { name: 'TVs & Monitors', slug: 'tvs-monitors', order: 2 },
    { name: 'Audio & Speakers', slug: 'audio-speakers', order: 3 },
    { name: 'Cameras', slug: 'cameras', order: 4 },
    { name: 'Gaming', slug: 'gaming', order: 5 },
    { name: 'Computer Accessories', slug: 'computer-accessories', order: 6 },
  ],
  'vehicles': [
    { name: 'Cars', slug: 'cars', order: 1 },
    { name: 'Motorcycles', slug: 'motorcycles', order: 2 },
    { name: 'Trucks & Buses', slug: 'trucks-buses', order: 3 },
    { name: 'Vehicle Parts', slug: 'vehicle-parts', order: 4 },
    { name: 'Boats', slug: 'boats', order: 5 },
  ],
  'property': [
    { name: 'Houses for Sale', slug: 'houses-for-sale', order: 1 },
    { name: 'Houses for Rent', slug: 'houses-for-rent', order: 2 },
    { name: 'Land & Plots', slug: 'land-plots', order: 3 },
    { name: 'Commercial Property', slug: 'commercial-property', order: 4 },
    { name: 'Short Let', slug: 'short-let', order: 5 },
  ],
  'services': [
    { name: 'Home Services', slug: 'home-services', order: 1 },
    { name: 'Tech & IT Services', slug: 'tech-it-services', order: 2 },
    { name: 'Education & Lessons', slug: 'education-lessons', order: 3 },
    { name: 'Health & Wellness', slug: 'health-wellness', order: 4 },
    { name: 'Events & Entertainment', slug: 'events-entertainment', order: 5 },
    { name: 'Fashion & Beauty', slug: 'fashion-beauty', order: 6 },
  ],
};

async function main() {
  let total = 0;
  for (const [parentSlug, children] of Object.entries(SUBCATEGORIES)) {
    const parent = await prisma.category.findUnique({ where: { slug: parentSlug } });
    if (!parent) { console.warn(`Parent not found: ${parentSlug}`); continue; }

    for (const child of children) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, order: child.order, parentId: parent.id },
        create: { ...child, parentId: parent.id },
      });
      total++;
    }
    console.log(`✓ ${parent.name}: ${children.length} subcategories`);
  }
  console.log(`Done — ${total} subcategories seeded`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
