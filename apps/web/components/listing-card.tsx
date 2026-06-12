'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutGrid, List } from 'lucide-react';
import type { SearchListing, PromotionTier } from '@lumo/shared';
import { formatNaira, locationLabel } from '@/lib/format';

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
    <Link
      href={`/listing/${item.slug}`}
      className={`group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md ${t.border}`}
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
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {item.condition === 'NEW' ? 'New' : item.condition === 'USED' ? 'Used' : 'For parts'}
          </span>
        </div>
      </div>
    </Link>
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
        <span className="mt-1 w-fit rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {item.condition === 'NEW' ? 'New' : item.condition === 'USED' ? 'Used' : 'For parts'}
        </span>
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
