import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NG_STATES, LANDING_MIN_LISTINGS, LANDING_TOP_N_PRERENDER } from '@lumo/shared';
import { getCategories, getLandingCombos, searchListings } from '@/lib/api';
import { toSlug, SLUG_TO_STATE } from '@/lib/states';
import { ListingFeed } from '@/components/listing-card';
import { SearchBar } from '@/components/search-bar';
import { SITE_NAME, breadcrumbJsonLd, itemListJsonLd, jsonLdScript } from '@/lib/seo';

export const revalidate = 600;
export const dynamicParams = true;

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

// Only the top LANDING_TOP_N_PRERENDER combos (by inventory) get instant TTFB; everything
// else below the inventory floor still renders, just on-demand via ISR.
export async function generateStaticParams() {
  const combos = await getLandingCombos();
  return combos.slice(0, LANDING_TOP_N_PRERENDER).map((c) => ({ slug: c.categorySlug, state: toSlug(c.state) }));
}

async function findCategory(slug: string) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; state: string }>;
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const { slug, state: stateSlug } = await params;
  const stateName = SLUG_TO_STATE[stateSlug];
  const cat = stateName ? await findCategory(slug) : null;
  if (!cat || !stateName) return { title: 'Page not found' };

  const sp = await searchParams;
  const page = Math.max(1, Number(str(sp.page) ?? '1') || 1);
  const results = await searchListings(
    new URLSearchParams({ categorySlug: slug, state: stateName, limit: '24', page: String(page) }).toString(),
  );

  const basePath = `/category/${slug}/${stateSlug}`;
  return {
    // Root layout's title template already appends " · {SITE_NAME}" — no manual suffix here.
    title: `${cat.name} for sale in ${stateName}`,
    description: `${results.total} ${cat.name} listings for sale in ${stateName}. Browse verified listings from local sellers on ${SITE_NAME}.`,
    alternates: { canonical: page > 1 ? `${basePath}?page=${page}` : basePath },
    // Thin-content guard: only index combos with real inventory. follow stays true so equity
    // still flows to the parent category/state pages.
    robots: { index: results.total >= LANDING_MIN_LISTINGS, follow: true },
  };
}

export default async function CategoryStatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; state: string }>;
  searchParams: Promise<SP>;
}) {
  const { slug, state: stateSlug } = await params;
  const stateName = SLUG_TO_STATE[stateSlug];
  if (!stateName) notFound();
  const cat = await findCategory(slug);
  if (!cat) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(str(sp.page) ?? '1') || 1);
  const sort = str(sp.sort);

  const results = await searchListings(
    new URLSearchParams({
      categorySlug: slug,
      state: stateName,
      limit: '24',
      page: String(page),
      ...(sort ? { sort } : {}),
    }).toString(),
  );

  const otherStates = NG_STATES.filter((s) => s !== stateName);

  return (
    <main className="container space-y-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: cat.name, url: `/category/${cat.slug}` },
            { name: stateName, url: `/category/${cat.slug}/${stateSlug}` },
          ]),
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          itemListJsonLd(results.items.map((l) => ({ name: l.title, url: `/listing/${l.slug}` }))),
        )}
      />

      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          <Link href={`/category/${cat.slug}`} className="hover:underline text-emerald-700">
            {cat.name}
          </Link>
          {' › '}
          {stateName}
        </p>
        <h1 className="text-2xl font-bold">
          {cat.name} for sale in {stateName}
        </h1>
        <SearchBar />
      </div>

      <p className="text-sm text-muted-foreground">{results.total} listings</p>
      <ListingFeed items={results.items} />

      {/* Internal linking — the same category across every other state. */}
      <div className="space-y-2 border-t pt-6">
        <h2 className="text-sm font-semibold text-slate-700">{cat.name} in other states</h2>
        <div className="flex flex-wrap gap-2">
          {otherStates.map((s) => (
            <Link
              key={s}
              href={`/category/${cat.slug}/${toSlug(s)}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition"
            >
              {s}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
