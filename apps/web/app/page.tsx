import Link from 'next/link';
import { getCategories, searchListings } from '@/lib/api';
import { SearchBar } from '@/components/search-bar';
import { ListingGrid } from '@/components/listing-card';

// ISR: home revalidates periodically.
export const revalidate = 60;

export default async function HomePage() {
  const [categories, results] = await Promise.all([
    getCategories(),
    searchListings('sort=newest&limit=12'),
  ]);

  return (
    <main className="container space-y-10 py-8">
      <section className="space-y-4 py-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Buy &amp; sell safely across Nigeria
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Verified sellers, fast moderation, local search down to your city.
        </p>
        <div className="flex justify-center">
          <SearchBar />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="rounded-full border px-4 py-1.5 text-sm hover:bg-accent"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Latest listings</h2>
        <ListingGrid items={results.items} />
      </section>
    </main>
  );
}
