'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutGrid, List } from 'lucide-react';
import type { SearchListing, PromotionTier } from '@lumo/shared';
import { formatNaira, locationLabel } from '@/lib/format';

const WA_SVG = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.551 4.1 1.516 5.82L.057 23.26a.75.75 0 0 0 .916.921l5.556-1.45A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.371l-.36-.213-3.724.972.992-3.624-.234-.373A9.818 9.818 0 1 1 12 21.818z"/>
  </svg>
);

function waCardUrl(title: string, priceKobo: number, slug: string) {
  const text = `${title} — ${formatNaira(priceKobo)}\n${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lumo.ng'}/listing/${slug}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// Single source of truth for tier appearance.
const TIERS: Record<PromotionTier, {
  border: string;
  badge: { label: string; cls: string } | null;
  trustOverlays: boolean;
}> = {
  NONE:       { border: 'border border-slate-200',     badge: null,                                                          trustOverlays: false },
  BOOST:      { border: 'border-2 border-amber-400',   badge: { label: '✦ Boosted',      cls: 'bg-amber-100 text-amber-800' },    trustOverlays: false },
  TOP:        { border: 'border-2 border-orange-500',  badge: { label: '🏅 Top ad',       cls: 'bg-orange-100 text-orange-800' },  trustOverlays: false },
  DIAMOND:    { border: 'border-2 border-emerald-500', badge: { label: '💎 Diamond',      cls: 'bg-emerald-100 text-emerald-800' }, trustOverlays: true },
  ENTERPRISE: { border: 'border-2 border-slate-800',   badge: { label: '🏪 Verified store', cls: 'bg-slate-900 text-white' },      trustOverlays: true },
};

function TierBadge({ tier }: { tier: PromotionTier }) {
  const b = TIERS[tier].badge;
  if (!b) return null;
  return (
    <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${b.cls}`}>
      {b.label}
    </span>
  );
}

function TrustOverlays({ verified, rating }: { verified: boolean; rating: number | null }) {
  return (
    <>
      {verified && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-sky-700 shadow-sm">
          ✔ Verified ID
        </span>
      )}
      {rating != null && (
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-sm">
          ★ {rating.toFixed(1)}
        </span>
      )}
    </>
  );
}

export function ListingCard({ item }: { item: SearchListing }) {
  const tier = (item.promotionTier ?? 'NONE') as PromotionTier;
  const t = TIERS[tier];
  return (
    <div className="group relative">
      <Link
        href={`/listing/${item.slug}`}
        className={`flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md ${t.border}`}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {item.primaryImage ? (
            <Image
              src={item.primaryImage}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
          <TierBadge tier={tier} />
          {t.trustOverlays && (
            <TrustOverlays verified={item.sellerVerified} rating={item.sellerRating} />
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <p className="text-base font-bold text-emerald-700">{formatNaira(item.priceKobo)}</p>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{item.title}</h3>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            📍 {locationLabel(item.state, item.city, item.area)}
          </p>
          <div className="mt-1 flex items-center justify-between gap-1">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {item.condition === 'NEW' ? 'New' : item.condition === 'USED' ? 'Used' : 'For parts'}
            </span>
            {item.sellerId && (
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/seller/${item.sellerId}`; }}
                onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = `/seller/${item.sellerId}`; }}
                className="truncate text-xs text-slate-400 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                {item.sellerName}
              </span>
            )}
          </div>
        </div>
      </Link>
      {/* WA share — outside the Link to avoid nested <a> */}
      <a
        href={waCardUrl(item.title, item.priceKobo, item.slug)}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on WhatsApp"
        className="absolute bottom-12 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white opacity-0 shadow transition-opacity group-hover:opacity-100 sm:opacity-100"
      >
        {WA_SVG}
      </a>
    </div>
  );
}

function ListingRow({ item }: { item: SearchListing }) {
  const tier = (item.promotionTier ?? 'NONE') as PromotionTier;
  const t = TIERS[tier];
  return (
    <Link
      href={`/listing/${item.slug}`}
      className={`group flex overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md ${t.border}`}
    >
      <div className="relative w-32 shrink-0 overflow-hidden bg-muted sm:w-44">
        {item.primaryImage ? (
          <Image src={item.primaryImage} alt={item.title} fill sizes="176px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
        <TierBadge tier={tier} />
        {t.trustOverlays && (
          <TrustOverlays verified={item.sellerVerified} rating={item.sellerRating} />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-base font-bold text-emerald-700">{formatNaira(item.priceKobo)}</p>
        <h3 className="text-sm font-medium leading-snug text-slate-800">{item.title}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          📍 {locationLabel(item.state, item.city, item.area)}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="w-fit rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {item.condition === 'NEW' ? 'New' : item.condition === 'USED' ? 'Used' : 'For parts'}
          </span>
          {item.sellerId && (
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/seller/${item.sellerId}`; }}
              onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = `/seller/${item.sellerId}`; }}
              className="truncate text-xs text-slate-400 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              {item.sellerName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ items }: { items: SearchListing[] }) {
  if (items.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No listings found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => <ListingCard key={item.id} item={item} />)}
    </div>
  );
}

export function ListingFeed({ items }: { items: SearchListing[] }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setView('grid')}
            className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`rounded-md p-1.5 ${view === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No listings found.</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => <ListingCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => <ListingRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
