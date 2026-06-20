import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getSellerProfile } from '@/lib/api';
import { ListingFeed } from '@/components/listing-card';
import { SITE_NAME } from '@/lib/seo';
import type { PublicListing, SellerReviewDTO } from '@lumo/shared';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function lastActiveLabel(iso: string | null): { label: string; color: 'green' | 'amber' | 'slate' } | null {
  if (!iso) return null;
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 60)    return { label: 'Active now',           color: 'green' };
  if (mins < 1440)  return { label: 'Active today',         color: 'green' };
  if (mins < 10080) return { label: 'Active this week',     color: 'amber' };
  const days = Math.floor(mins / 1440);
  if (days < 30)    return { label: `Last seen ${days}d ago`, color: 'slate' };
  return { label: 'Last seen a while ago', color: 'slate' };
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Metadata ──────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

async function getSellerReviewsData(id: string): Promise<{ reviews: SellerReviewDTO[]; total: number }> {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const res = await fetch(
      `${BASE}/sellers/${id}/reviews`,
      isDev ? { cache: 'no-store' } : { next: { revalidate: 120 } },
    );
    if (!res.ok) return { reviews: [], total: 0 };
    return res.json();
  } catch {
    return { reviews: [], total: 0 };
  }
}

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, reviewData] = await Promise.all([getSellerData(id), getSellerReviewsData(id)]);
  if (!data?.seller) notFound();

  const { seller, listings } = data;

  const joinedDate   = new Date(seller!.createdAt);
  const joinedMonth  = MONTH_NAMES[joinedDate.getMonth()];
  const joinedYear   = joinedDate.getFullYear();
  const sellerYears  = new Date().getFullYear() - joinedYear;
  const isVeteran    = sellerYears >= 2;

  const activity     = lastActiveLabel((seller as typeof seller & { lastActiveAt?: string | null }).lastActiveAt ?? null);

  const initials = (seller!.name ?? 'S')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const hasLocation  = seller!.city || seller!.state;
  const locationLabel = [seller!.city, seller!.state].filter(Boolean).join(', ');

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
    sellerId: seller!.id,
    sellerName: seller!.name,
    sellerVerified: seller!.verification === 'VERIFIED',
    sellerRating: seller!.ratingAvg,
    sellerYears,
  }));

  return (
    <main className="container py-8 space-y-8">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white shadow-lg">
        {/* Dot-grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-white/30 shadow-lg">
              {seller!.avatarUrl ? (
                <Image src={seller!.avatarUrl} alt={seller!.name} fill className="object-cover" sizes="80px" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-emerald-500 text-2xl font-bold text-white">
                  {initials}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* ① Name + verified badge (improved) */}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{seller!.name}</h1>

              {seller!.verification === 'VERIFIED' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/30 backdrop-blur-sm">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  ID Verified by Lumo
                </span>
              )}

              {/* ② Veteran badge */}
              {isVeteran && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30">
                  ★ Veteran seller
                </span>
              )}
            </div>

            {/* ③ Stats row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">

              {/* Last active */}
              {activity && (
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    activity.color === 'green' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' :
                    activity.color === 'amber' ? 'bg-amber-400' : 'bg-slate-400'
                  }`} />
                  {activity.label}
                </span>
              )}

              {/* Location */}
              {hasLocation && (
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {locationLabel}
                </span>
              )}

              {/* Active listings */}
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                {seller!.listingCount} active listing{seller!.listingCount !== 1 ? 's' : ''}
              </span>

              {/* Rating */}
              {seller!.ratingAvg != null && seller!.ratingAvg > 0 && (
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                  </svg>
                  {seller!.ratingAvg.toFixed(1)}
                  <span className="text-white/55">({seller!.ratingCount})</span>
                </span>
              )}

              {/* ② Time on Lumo — precise month + year */}
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Member since {joinedMonth} {joinedYear}
              </span>

              {/* ③ Response rate */}
              {seller!.avgReplyHours != null && (
                <span className="flex items-center gap-1">
                  ⚡ Replies {seller!.avgReplyHours < 1 ? '< 1h' : seller!.avgReplyHours < 24 ? `~${Math.round(seller!.avgReplyHours)}h` : `~${Math.round(seller!.avgReplyHours / 24)}d`}
                </span>
              )}
            </div>

            {/* Bio */}
            {seller!.bio && (
              <p className="text-sm italic text-white/85 leading-relaxed max-w-prose">
                &ldquo;{seller!.bio}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Listings ──────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Listings by {seller!.name}
          </h2>
          {feedItems.length > 0 && (
            <span className="text-sm text-slate-400">{feedItems.length} listing{feedItems.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {feedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <p className="text-sm text-slate-400">No active listings from this seller.</p>
          </div>
        ) : (
          <ListingFeed items={feedItems} />
        )}
      </div>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      {reviewData.total > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            Reviews <span className="text-slate-400">({reviewData.total})</span>
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <ul className="space-y-3">
              {reviewData.reviews.map((r: SellerReviewDTO) => (
                <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{r.authorName}</span>
                    <span className="text-amber-400">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {r.body && <p className="mt-1 text-sm text-slate-600">{r.body}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
