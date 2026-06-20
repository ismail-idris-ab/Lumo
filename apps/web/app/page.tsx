import Link from 'next/link';
import { getCategoryTree, searchListings } from '@/lib/api';
import { SearchBar } from '@/components/search-bar';
import { HomeFeed } from '@/components/home-feed';

// ISR: home revalidates periodically.
export const revalidate = 60;

const CATEGORY_ICONS: Record<string, string> = {
  'phones-tablets': '📱',
  'electronics': '💻',
  'vehicles': '🚗',
  'property': '🏠',
  'services': '🛠️',
};

export default async function HomePage() {
  const [categoryTree, results] = await Promise.all([
    getCategoryTree(),
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Browse categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {categoryTree.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-emerald-400 hover:shadow-sm"
            >
              <span className="text-3xl">{CATEGORY_ICONS[c.slug] ?? '📦'}</span>
              <span className="text-sm font-medium text-slate-800 group-hover:text-emerald-700">
                {c.name}
              </span>
              {(c.children ?? []).length > 0 && (
                <span className="text-xs text-slate-400">
                  {(c.children ?? []).length} subcategories
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Latest listings</h2>
        <HomeFeed initial={results.items} totalPages={results.totalPages} />
      </section>
    </main>
  );
}
