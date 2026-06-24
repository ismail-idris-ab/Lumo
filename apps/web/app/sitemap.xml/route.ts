import { SITEMAP_CHUNK_SIZE } from '@lumo/shared';
import { getSitemapCount, getLandingCombos } from '@/lib/api';
import { SITE_URL, escapeXml } from '@/lib/seo';

export const revalidate = 3600;

// Sitemap index — Next's generateSitemaps doesn't emit one (so /sitemap.xml 404s under it),
// hence a hand-written Route Handler instead of the metadata-file convention.
export async function GET() {
  const [total, landingCombos] = await Promise.all([getSitemapCount(), getLandingCombos()]);
  const chunks = Math.max(1, Math.ceil(total / SITEMAP_CHUNK_SIZE));
  const landingChunks = landingCombos.length > 0 ? Math.ceil(landingCombos.length / SITEMAP_CHUNK_SIZE) : 0;
  const urls = [
    `${SITE_URL}/sitemap/pages.xml`,
    ...Array.from({ length: chunks }, (_, i) => `${SITE_URL}/sitemap/listings-${i}.xml`),
    ...Array.from({ length: landingChunks }, (_, i) => `${SITE_URL}/sitemap/landing-${i}.xml`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <sitemap><loc>${escapeXml(u)}</loc></sitemap>`).join('\n')}
</sitemapindex>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
