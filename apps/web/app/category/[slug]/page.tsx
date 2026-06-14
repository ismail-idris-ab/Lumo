import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CategorySummary } from '@lumo/shared';
import { getCategoryTree, searchListings } from '@/lib/api';
import { ListingFeed } from '@/components/listing-card';
import { SearchBar } from '@/components/search-bar';
import { SITE_NAME, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';

export const revalidate = 120;

export async function generateStaticParams() {
  const tree = await getCategoryTree();
  const slugs: { slug: string }[] = [];
  for (const parent of tree) {
    slugs.push({ slug: parent.slug });
    for (const child of parent.children ?? []) {
      slugs.push({ slug: child.slug });
    }
  }
  return slugs;
}

async function findCategory(slug: string): Promise<{ cat: CategorySummary; parent: CategorySummary | null }> {
  const tree = await getCategoryTree();
  for (const parent of tree) {
    if (parent.slug === slug) return { cat: parent, parent: null };
    for (const child of parent.children ?? []) {
      if (child.slug === slug) return { cat: child, parent };
    }
  }
  return { cat: null as unknown as CategorySummary, parent: null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { cat } = await findCategory(slug);
  if (!cat) return { title: 'Category not found' };
  return {
    title: `${cat.name} for sale in Nigeria`,
    description: `Browse ${cat.name} listings from verified sellers on ${SITE_NAME}.`,
    alternates: { canonical: `/category/${cat.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { cat, parent } = await findCategory(slug);
  if (!cat) notFound();

  const results = await searchListings(`categorySlug=${encodeURIComponent(slug)}&limit=24`);
  const subcategories = cat.children ?? [];

  const breadcrumbs = parent
    ? [
        { name: 'Home', url: '/' },
        { name: parent.name, url: `/category/${parent.slug}` },
        { name: cat.name, url: `/category/${cat.slug}` },
      ]
    : [
        { name: 'Home', url: '/' },
        { name: cat.name, url: `/category/${cat.slug}` },
      ];

  return (
    <main className="container space-y-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd(breadcrumbs))}
      />
      <div className="space-y-3">
        {parent && (
          <p className="text-sm text-slate-500">
            <Link href={`/category/${parent.slug}`} className="hover:underline text-emerald-700">
              {parent.name}
            </Link>
            {' › '}
            {cat.name}
          </p>
        )}
        <h1 className="text-2xl font-bold">{cat.name}</h1>
        <SearchBar />
      </div>

      {/* Subcategory chips — shown on parent pages */}
      {subcategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/category/${sub.slug}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{results.total} listings</p>
      <ListingFeed items={results.items} />
    </main>
  );
}
