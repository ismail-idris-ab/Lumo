import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NG_STATES } from '@lumo/shared';
import { searchListings } from '@/lib/api';
import { ListingFeed } from '@/components/listing-card';
import { SearchBar } from '@/components/search-bar';
import { SITE_NAME, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';

export const revalidate = 120;

function toSlug(state: string) {
  return state.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Bidirectional map: slug → canonical state name
const SLUG_TO_STATE = Object.fromEntries(NG_STATES.map((s) => [toSlug(s), s]));

export async function generateStaticParams() {
  return NG_STATES.map((s) => ({ state: toSlug(s) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state: slug } = await params;
  const name = SLUG_TO_STATE[slug];
  if (!name) return { title: 'State not found' };
  return {
    title: `Buy & Sell in ${name} — ${SITE_NAME}`,
    description: `Browse classified ads in ${name}. Find phones, cars, furniture and more from verified sellers on ${SITE_NAME}.`,
    alternates: { canonical: `/listings/${slug}` },
  };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params;
  const name = SLUG_TO_STATE[slug];
  if (!name) notFound();

  const results = await searchListings(
    new URLSearchParams({ state: name, limit: '24' }).toString(),
  );

  return (
    <main className="container space-y-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: name, url: `/listings/${slug}` },
          ]),
        )}
      />
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Buy &amp; Sell in {name}</h1>
        <SearchBar />
      </div>
      <p className="text-sm text-muted-foreground">{results.total} listings in {name}</p>
      <ListingFeed items={results.items} />
    </main>
  );
}
