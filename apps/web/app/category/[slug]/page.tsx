import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CategorySummary } from '@lumo/shared';
import { getCategories, searchListings } from '@/lib/api';
import { ListingGrid } from '@/components/listing-card';
import { SearchBar } from '@/components/search-bar';
import { SITE_NAME, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';

export const revalidate = 120;

// Pre-build all category pages at deploy time (small stable set).
// Unknown slugs are resolved on-demand and then cached (ISR).
export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map((c) => ({ slug: c.slug }));
}

async function findCategory(slug: string): Promise<CategorySummary | null> {
  const cats = await getCategories();
  return cats.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) return { title: 'Category not found' };
  return {
    title: `${cat.name} for sale in Nigeria`,
    description: `Browse ${cat.name} listings from verified sellers on ${SITE_NAME}.`,
    alternates: { canonical: `/category/${cat.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) notFound();

  const results = await searchListings(`categorySlug=${encodeURIComponent(slug)}&limit=24`);

  return (
    <main className="container space-y-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: cat.name, url: `/category/${cat.slug}` },
          ]),
        )}
      />
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{cat.name}</h1>
        <SearchBar />
      </div>
      <p className="text-sm text-muted-foreground">{results.total} listings</p>
      <ListingGrid items={results.items} />
    </main>
  );
}
