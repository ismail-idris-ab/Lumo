import { prisma } from '../lib/prisma';

const SUBCATEGORIES: Record<string, { name: string; slug: string; order: number }[]> = {
  'phones-tablets': [
    // reuse 'smartphones' slug so existing listings keep their categoryId
    { name: 'Mobile Phones', slug: 'smartphones', order: 1 },
    { name: 'Tablets', slug: 'tablets', order: 2 },
    // reuse 'phone-accessories' slug
    { name: 'Accessories for Phones & Tablets', slug: 'phone-accessories', order: 3 },
    { name: 'Smart Watches & Wearables', slug: 'smart-watches-wearables', order: 4 },
    { name: 'Phone Parts & Components', slug: 'phone-parts-components', order: 5 },
    { name: 'Phone & Tablet Repair & Services', slug: 'phone-tablet-repair', order: 6 },
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

// Obsolete phone subcategory slugs merged into Mobile Phones / Tablets above.
const OBSOLETE_SLUGS = ['iphones', 'ipads', 'feature-phones'];

async function main() {
  // Remove stale subcategories (safe when no listings reference them; skip if FK error).
  for (const slug of OBSOLETE_SLUGS) {
    try {
      await prisma.category.delete({ where: { slug } });
      console.log(`  deleted obsolete: ${slug}`);
    } catch {
      console.warn(`  skipped delete (in use or missing): ${slug}`);
    }
  }

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
