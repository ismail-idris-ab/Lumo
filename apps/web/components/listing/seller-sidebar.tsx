'use client';
import Link from 'next/link';
import type { PublicListing, SellerReviewDTO } from '@lumo/shared';
import { formatNaira } from '@/lib/format';
import { MarketPriceCard } from './market-price-card';
import { ListingActions } from './listing-actions';
import { SITE_NAME } from '@/lib/seo';

interface Props {
  listing: PublicListing;
  reviews: SellerReviewDTO[];
  reviewTotal: number;
}

export function SellerSidebar({ listing, reviews: _reviews, reviewTotal }: Props) {
  const seller = listing.seller;

  const sellerYears = seller
    ? Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  return (
    <div className="space-y-3">
      {/* Price card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-2xl font-extrabold text-emerald-700">{formatNaira(listing.priceKobo)}</p>
        <span className="mt-1 inline-block rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
          Fixed price
        </span>
        {listing.marketLowKobo != null && listing.marketHighKobo != null && (
          <div className="mt-3">
            <MarketPriceCard
              priceKobo={listing.priceKobo}
              marketLowKobo={listing.marketLowKobo}
              marketHighKobo={listing.marketHighKobo}
            />
          </div>
        )}
      </div>

      {/* Contact + actions (client component — handles auth gate, reveal, chat, save, report) */}
      {seller && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ListingActions
            listingId={listing.id}
            slug={listing.slug}
            sellerId={seller.id}
          />
        </div>
      )}

      {/* Seller card */}
      {seller && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              {seller.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <Link href={`/seller/${seller.id}`} className="block font-semibold hover:text-emerald-700 hover:underline">
                {seller.name}
              </Link>
              <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                {sellerYears >= 1 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    {sellerYears}+ yrs on {SITE_NAME}
                  </span>
                )}
                {seller.verification === 'VERIFIED' && (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                    ✔ Verified ID
                  </span>
                )}
                {seller.ratingAvg != null && seller.ratingAvg > 0 && (
                  <span className="text-amber-600">★ {seller.ratingAvg.toFixed(1)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Link
              href={`/seller/${seller.id}`}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              View all listings →
            </Link>
            {reviewTotal > 0 && (
              <span className="text-xs text-amber-700">😊 {reviewTotal} Feedback</span>
            )}
          </div>
        </div>
      )}

      {/* Safety tips */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-center text-sm font-semibold">Safety tips</h3>
        <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
          <li>Avoid paying in advance, even for delivery.</li>
          <li>Meet the seller at a safe public place.</li>
          <li>Inspect the item to ensure it is what you need.</li>
          <li>Only pay if you are satisfied.</li>
        </ul>
      </div>
    </div>
  );
}
