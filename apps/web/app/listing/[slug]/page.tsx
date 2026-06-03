import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getListing } from '@/lib/api';
import { formatNaira, locationLabel } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SITE_NAME,
  breadcrumbJsonLd,
  jsonLdScript,
  productJsonLd,
} from '@/lib/seo';

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
  const listing = await getListing(slug);
  if (!listing) notFound(); // 404 for missing/unavailable (expired/suspended) listings

  const primary = listing.images.find((i) => i.isPrimary) ?? listing.images[0];
  const loginNext = `/login?next=/listing/${listing.slug}`;

  return (
    <main className="container grid gap-8 py-8 lg:grid-cols-2">
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

      {/* Gallery */}
      <div className="space-y-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {primary ? (
            <Image src={primary.url} alt={listing.title} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
          )}
        </div>
        {listing.images.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {listing.images.map((img) => (
              <div key={img.id} className="relative aspect-square overflow-hidden rounded bg-muted">
                <Image src={img.url} alt={listing.title} fill sizes="20vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="text-2xl font-bold text-primary">{formatNaira(listing.priceKobo)}</p>
          <p className="text-sm text-muted-foreground">
            {CONDITION_LABEL[listing.condition]} · {locationLabel(listing.state, listing.city, listing.area)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={loginNext} className={cn(buttonVariants())}>
            Show phone
          </Link>
          <Link href={loginNext} className={cn(buttonVariants({ variant: 'outline' }))}>
            Chat
          </Link>
          <Link href={loginNext} className={cn(buttonVariants({ variant: 'ghost' }))}>
            Save
          </Link>
        </div>

        <div className="prose-sm whitespace-pre-wrap text-sm leading-relaxed">
          {listing.description}
        </div>

        {listing.seller && (
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">{listing.seller.name}</p>
            <p className="text-muted-foreground">
              {listing.seller.verification === 'VERIFIED' ? '✓ Verified seller · ' : ''}
              on {SITE_NAME} since {new Date(listing.seller.createdAt).getFullYear()}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
