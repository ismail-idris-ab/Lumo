import type { MetadataRoute } from 'next';
import { getCategories, searchListings } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

// Only APPROVED + non-expired listings appear (search index = sitemap source, PRD §19).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, listings] = await Promise.all([
    getCategories(),
    searchListings('limit=100&sort=newest'),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: 'daily', priority: 0.7 },
  ];
  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));
  const listingPages: MetadataRoute.Sitemap = listings.items.map((l) => ({
    url: `${SITE_URL}/listing/${l.slug}`,
    lastModified: l.createdAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...listingPages];
}
