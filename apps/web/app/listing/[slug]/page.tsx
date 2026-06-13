import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getListing, getSellerReviews } from '@/lib/api';
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

  const primary = listing.images.find((i) => i.isPrimary) ?? listing.images[0];
  const otherImages = listing.images.filter((i) => !i.isPrimary).slice(0, 4);

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
    </main>
  );
}
