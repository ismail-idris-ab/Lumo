import type { CategorySummary, Paginated, PublicListing, SearchListing } from '@lumo/shared';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

// Server-side GET with ISR revalidation. Returns null on any failure (pages degrade gracefully).
async function get<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
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

export async function searchListings(qs: string): Promise<Paginated<SearchListing>> {
  const data = await get<Paginated<SearchListing>>(`/search?${qs}`, 30);
  return data ?? { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
}

export async function getListing(slug: string): Promise<PublicListing | null> {
  const data = await get<{ listing: PublicListing }>(`/listings/${encodeURIComponent(slug)}`, 60);
  return data?.listing ?? null;
}
