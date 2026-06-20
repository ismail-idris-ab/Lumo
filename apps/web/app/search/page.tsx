import type { Metadata } from 'next';
import Link from 'next/link';
import { searchListings } from '@/lib/api';
import { ListingFeed } from '@/components/listing-card';
import { SearchBar } from '@/components/search-bar';
import { SearchFilters } from '@/components/search-filters';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SaveSearchButton } from '@/components/save-search-button';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = str(sp.q);
  return {
    title: q ? `Search: ${q}` : 'Search listings',
    alternates: { canonical: '/search' },
    robots: { index: !q },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const key of ['q', 'categorySlug', 'state', 'city', 'condition', 'sort', 'minPriceKobo', 'maxPriceKobo']) {
    const v = str(sp[key]);
    if (v) params.set(key, v);
  }
  const page = Math.max(1, Number(str(sp.page) ?? '1') || 1);
  params.set('page', String(page));
  params.set('limit', '24');

  const results = await searchListings(params.toString());
  const q = str(sp.q) ?? '';

  const pageLink = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    return `/search?${next.toString()}`;
  };

  // Pass current filter values to client component for controlled state.
  const minKobo = str(sp.minPriceKobo);
  const maxKobo = str(sp.maxPriceKobo);

  return (
    <main className="container space-y-4 py-8">
      <SearchBar defaultValue={q} />

      <SearchFilters
        currentState={str(sp.state)}
        currentCondition={str(sp.condition)}
        currentSort={str(sp.sort)}
        currentMinPrice={minKobo ? String(Number(minKobo) / 100) : undefined}
        currentMaxPrice={maxKobo ? String(Number(maxKobo) / 100) : undefined}
      />

      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {results.total} result{results.total === 1 ? '' : 's'}
          {q ? ` for "${q}"` : ''}
        </p>
        <SaveSearchButton
          searchParams={{
            q: str(sp.q),
            categoryId: str(sp.categoryId),
            state: str(sp.state),
            condition: str(sp.condition),
            minPriceKobo: str(sp.minPriceKobo),
            maxPriceKobo: str(sp.maxPriceKobo),
          }}
        />
      </div>

      <ListingFeed items={results.items} />

      {results.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 1 && (
            <Link href={pageLink(page - 1)} className={cn(buttonVariants({ variant: 'outline' }))}>
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {results.totalPages}
          </span>
          {page < results.totalPages && (
            <Link href={pageLink(page + 1)} className={cn(buttonVariants({ variant: 'outline' }))}>
              Next
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
