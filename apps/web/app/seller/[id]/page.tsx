import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSellerProfile } from '@/lib/api';
import { ListingFeed } from '@/components/listing-card';
import { SITE_NAME } from '@/lib/seo';
import type { PublicListing } from '@lumo/shared';

export const revalidate = 120;

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

async function getSellerData(id: string) {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const res = await fetch(
      `${BASE}/sellers/${id}`,
      isDev ? { cache: 'no-store' } : { next: { revalidate: 120 } },
    );
    if (!res.ok) return null;
    return res.json() as Promise<{ seller: Awaited<ReturnType<typeof getSellerProfile>>; listings: PublicListing[] }>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getSellerData(id);
  if (!data?.seller) return { title: 'Seller not found' };
  return {
    title: `${data.seller.name} — Seller on ${SITE_NAME}`,
    description: `Browse ${data.seller.listingCount} active listings from ${data.seller.name} on ${SITE_NAME}.`,
    alternates: { canonical: `/seller/${id}` },
  };
}

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSellerData(id);
  if (!data?.seller) notFound();

  const { seller, listings } = data;
  const sellerYears = Math.floor(
    (Date.now() - new Date(seller!.createdAt).getTime()) / (365.25 * 24 * 3600 * 1000),
  );

  // Convert PublicListing → SearchListing shape for ListingFeed
  const feedItems = listings.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    priceKobo: l.priceKobo,
    condition: l.condition,
    state: l.state,
    city: l.city,
    area: l.area,
    categorySlug: '',
    categoryName: l.category?.name ?? '',
    isPromoted: l.isPromoted,
    promotionTier: l.promotionTier,
    primaryImage: l.images.find((i) => i.isPrimary)?.url ?? l.images[0]?.url ?? null,
    createdAt: l.createdAt,
    sellerVerified: seller!.verification === 'VERIFIED',
    sellerRating: seller!.ratingAvg,
    sellerYears,
  }));

  return (
    <main className="container py-8 space-y-6">
      {/* Seller header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 overflow-hidden">
          {seller!.avatarUrl ? (
            <Image src={seller!.avatarUrl} alt={seller!.name} width={64} height={64} className="object-cover" />
          ) : (
            seller!.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{seller!.name}</h1>
            {seller!.verification === 'VERIFIED' && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">✔ Verified ID</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-3 text-sm text-slate-500">
            {sellerYears >= 1 && <span>🕐 {sellerYears}+ yr{sellerYears !== 1 ? 's' : ''} on {SITE_NAME}</span>}
            <span>📦 {seller!.listingCount} active listing{seller!.listingCount !== 1 ? 's' : ''}</span>
            {seller!.ratingAvg != null && seller!.ratingAvg > 0 && (
              <span>⭐ {seller!.ratingAvg.toFixed(1)} ({seller!.ratingCount} review{seller!.ratingCount !== 1 ? 's' : ''})</span>
            )}
          </div>
        </div>
      </div>

      {/* Listings */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Listings by {seller!.name}
        </h2>
        {feedItems.length === 0 ? (
          <p className="text-sm text-slate-400">No active listings.</p>
        ) : (
          <ListingFeed items={feedItems} />
        )}
      </div>
    </main>
  );
}
