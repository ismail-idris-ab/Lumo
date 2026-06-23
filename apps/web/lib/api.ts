import { SITEMAP_CHUNK_SIZE, type CategorySummary, type Paginated, type PublicListing, type SearchListing, type SellerReviewDTO, type SellerPublicProfile } from '@lumo/shared';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

// Server-side GET with ISR revalidation. Returns null on any failure (pages degrade gracefully).
async function get<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const res = await fetch(
      `${BASE}${path}`,
      isDev ? { cache: 'no-store' } : { next: { revalidate } },
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<CategorySummary[]> {
  const data = await get<{ categories: CategorySummary[] }>('/categories', 3600);
  return data?.categories ?? [];
}

export async function getCategoryTree(): Promise<CategorySummary[]> {
  const data = await get<{ categories: CategorySummary[] }>('/categories?tree=true', 3600);
  return data?.categories ?? [];
}

export async function searchListings(qs: string): Promise<Paginated<SearchListing>> {
  const data = await get<Paginated<SearchListing>>(`/search?${qs}`, 30);
  return data ?? { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
}

export async function getListing(slug: string): Promise<PublicListing | null> {
  const data = await get<{ listing: PublicListing }>(`/listings/${encodeURIComponent(slug)}`, 60);
  return data?.listing ?? null;
}

export async function getSimilarListings(
  categorySlug: string,
  state: string,
  excludeId: string,
): Promise<SearchListing[]> {
  const exclude = (items: SearchListing[]) => items.filter((l) => l.id !== excludeId).slice(0, 4);

  // Try same category + same state first.
  if (categorySlug && state) {
    const params = new URLSearchParams({ categorySlug, state, limit: '5' });
    const data = await get<Paginated<SearchListing>>(`/search?${params.toString()}`, 120);
    const results = exclude(data?.items ?? []);
    if (results.length > 0) return results;
  }

  // Fall back to same category only (any state).
  if (categorySlug) {
    const params = new URLSearchParams({ categorySlug, limit: '5' });
    const data = await get<Paginated<SearchListing>>(`/search?${params.toString()}`, 120);
    return exclude(data?.items ?? []);
  }

  return [];
}

export async function getSellerProfile(sellerId: string): Promise<SellerPublicProfile | null> {
  const data = await get<{ seller: SellerPublicProfile }>(`/sellers/${sellerId}`, 120);
  return data?.seller ?? null;
}

export async function getSellerReviews(
  listingId: string,
): Promise<{ reviews: SellerReviewDTO[]; total: number }> {
  const data = await get<{ reviews: SellerReviewDTO[]; total: number }>(
    `/listings/${encodeURIComponent(listingId)}/reviews`,
    60,
  );
  return data ?? { reviews: [], total: 0 };
}

export async function getSitemapCount(): Promise<number> {
  const data = await get<{ total: number }>('/listings/sitemap/count', 3600);
  return data?.total ?? 0;
}

export async function getSitemapChunk(page: number): Promise<{ slug: string; updatedAt: string }[]> {
  const data = await get<{ items: { slug: string; updatedAt: string }[] }>(
    `/listings/sitemap?page=${page}&limit=${SITEMAP_CHUNK_SIZE}`,
    3600,
  );
  return data?.items ?? [];
}
