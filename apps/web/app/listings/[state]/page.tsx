import type { Metadata } from 'next';
import { searchListings } from '@/lib/api';
import { ListingFeed } from '@/components/listing-card';
import { SearchBar } from '@/components/search-bar';
import { SITE_NAME, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';

export const revalidate = 120;

// Common Nigerian states for SSG.
const NIGERIAN_STATES = [
  'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City',
  'Kaduna', 'Enugu', 'Onitsha', 'Warri', 'Ilorin', 'Aba', 'Jos',
  'Maiduguri', 'Zaria', 'Owerri', 'Uyo', 'Asaba', 'Calabar', 'Abeokuta',
  'Akure', 'Bauchi', 'Makurdi', 'Minna', 'Oshogbo', 'Sokoto',
];

export async function generateStaticParams() {
  return NIGERIAN_STATES.map((s) => ({ state: s.toLowerCase().replace(/\s+/g, '-') }));
}

function toDisplay(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const name = toDisplay(state);
  return {
    title: `Buy & Sell in ${name} — ${SITE_NAME}`,
    description: `Browse classified ads in ${name}. Find phones, cars, furniture and more from verified sellers on ${SITE_NAME}.`,
    alternates: { canonical: `/listings/${state}` },
  };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const name = toDisplay(state);

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
            { name: name, url: `/listings/${state}` },
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
