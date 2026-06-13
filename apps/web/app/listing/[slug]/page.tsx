import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getListing, getSellerReviews, getSimilarListings } from '@/lib/api';
import { ListingFeed } from '@/components/listing-card';
import { formatNaira, locationLabel } from '@/lib/format';
import { AttributeGrid } from '@/components/listing/attribute-grid';
import { ReviewSection } from '@/components/listing/review-section';
import { SellerSidebar } from '@/components/listing/seller-sidebar';
import { breadcrumbJsonLd, jsonLdScript, productJsonLd } from '@/lib/seo';

export const revalidate = 60;

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New',
  USED: 'Used',
  FOR_PARTS: 'For parts',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: 'Listing not found' };
  const title = `${listing.title} — ${formatNaira(listing.priceKobo)}`;
  const description = listing.description.slice(0, 160);
  const image = listing.images.find((i) => i.isPrimary)?.url ?? listing.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/listing/${listing.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [listing, reviewData] = await Promise.all([
    getListing(slug),
    getSellerReviews(slug),
  ]);
  if (!listing) notFound();

  const similar = await getSimilarListings(
    listing.category?.slug ?? '',
    listing.state,
    listing.id,
  );

  const primary = listing.images.find((i) => i.isPrimary) ?? listing.images[0];

  const attributeSchema = listing.category?.attributeSchema as
    | { key: string; label: string; primary?: boolean; format?: string }[]
    | null
    | undefined;

  return (
    <main className="container py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(productJsonLd(listing))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            ...(listing.category
              ? [{ name: listing.category.name, url: `/category/${listing.category.slug}` }]
              : []),
            { name: listing.title, url: `/listing/${listing.slug}` },
          ]),
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_560px]">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">
          {/* Gallery */}
          <div className="space-y-2">
            <div className="relative h-[380px] overflow-hidden rounded-xl bg-muted md:h-[440px]">
              {primary ? (
                <Image
                  src={primary.url}
                  alt={listing.title}
                  fill
                  sizes="(max-width:1024px) 100vw, 65vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              {listing.isPromoted && (
                <span className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                  Promoted
                </span>
              )}
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
                📷 1/{listing.images.length || 1}
              </span>
            </div>
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {listing.images.map((img) => (
                  <div key={img.id} className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image src={img.url} alt={listing.title} fill sizes="80px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>📍 {locationLabel(listing.state, listing.city, listing.area)}</span>
            <span>🕐 {new Date(listing.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="ml-auto">👁 {listing.viewsCount} views</span>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${listing.title} — ${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lumo.ng'}/listing/${listing.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.551 4.1 1.516 5.82L.057 23.26a.75.75 0 0 0 .916.921l5.556-1.45A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.371l-.36-.213-3.724.972.992-3.624-.234-.373A9.818 9.818 0 1 1 12 21.818z"/></svg>
              Share on WhatsApp
            </a>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900">{listing.title}</h1>

          {/* Attribute grid or condition fallback */}
          {attributeSchema && listing.attributes ? (
            <AttributeGrid
              schema={attributeSchema}
              attributes={listing.attributes as Record<string, unknown>}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">{CONDITION_LABEL[listing.condition] ?? listing.condition}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Condition</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {listing.description}
            </p>
          </div>

          {/* Reviews */}
          {listing.seller && (
            <ReviewSection
              listingId={listing.id}
              sellerId={listing.seller.id}
              slug={listing.slug}
              initialReviews={reviewData.reviews}
              initialTotal={reviewData.total}
            />
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <SellerSidebar
            listing={listing}
            reviews={reviewData.reviews}
            reviewTotal={reviewData.total}
          />
        </div>
      </div>

      {/* Similar listings */}
      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">You might also like</h2>
          <ListingFeed items={similar} />
        </section>
      )}
    </main>
  );
}
