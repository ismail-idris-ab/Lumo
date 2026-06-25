import { SITEMAP_CHUNK_SIZE } from '@lumo/shared';
import { getCategories, getSitemapChunk, getLandingCombos } from '@/lib/api';
import { toSlug } from '@/lib/states';
import { SITE_URL, escapeXml } from '@/lib/seo';

export const revalidate = 3600;

function urlEntry(loc: string, lastmod?: string): string {
  return `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
}

function urlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
}

// Two id shapes: "pages" (static + category pages) and "listings-<n>" (Postgres-backed chunk,
// n is the page index into countSitemapListings()/SITEMAP_CHUNK_SIZE).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id.replace(/\.xml$/, '');

  if (id === 'pages') {
    const categories = await getCategories();
    const entries = [
      urlEntry(SITE_URL),
      urlEntry(`${SITE_URL}/search`),
      urlEntry(`${SITE_URL}/safety`),
      urlEntry(`${SITE_URL}/about`),
      urlEntry(`${SITE_URL}/careers`),
      urlEntry(`${SITE_URL}/terms`),
      urlEntry(`${SITE_URL}/privacy`),
      urlEntry(`${SITE_URL}/billing-policy`),
      urlEntry(`${SITE_URL}/candidate-privacy`),
      urlEntry(`${SITE_URL}/cookie-policy`),
      urlEntry(`${SITE_URL}/copyright-policy`),
      ...categories.map((c) => urlEntry(`${SITE_URL}/category/${c.slug}`)),
    ];
    return new Response(urlset(entries), { headers: { 'Content-Type': 'application/xml' } });
  }

  const match = /^listings-(\d+)$/.exec(id);
  if (match) {
    const items = await getSitemapChunk(Number(match[1]));
    const entries = items.map((l) => urlEntry(`${SITE_URL}/listing/${l.slug}`, l.updatedAt));
    return new Response(urlset(entries), { headers: { 'Content-Type': 'application/xml' } });
  }

  const landingMatch = /^landing-(\d+)$/.exec(id);
  if (landingMatch) {
    const combos = await getLandingCombos();
    const page = Number(landingMatch[1]);
    const slice = combos.slice(page * SITEMAP_CHUNK_SIZE, (page + 1) * SITEMAP_CHUNK_SIZE);
    // No lastmod — there's no honest per-combo value to report.
    const entries = slice.map((c) => urlEntry(`${SITE_URL}/category/${c.categorySlug}/${toSlug(c.state)}`));
    return new Response(urlset(entries), { headers: { 'Content-Type': 'application/xml' } });
  }

  return new Response('Not found', { status: 404 });
}
