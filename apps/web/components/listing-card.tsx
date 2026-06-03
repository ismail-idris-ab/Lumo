import Link from 'next/link';
import Image from 'next/image';
import type { SearchListing } from '@lumo/shared';
import { formatNaira, locationLabel } from '@/lib/format';

export function ListingCard({ item }: { item: SearchListing }) {
  return (
    <Link
      href={`/listing/${item.slug}`}
      className="group block overflow-hidden rounded-lg border bg-card transition hover:shadow-md"
    >
      <div className="relative aspect-square bg-muted">
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
        {item.isPromoted && (
          <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            Promoted
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="font-semibold text-primary">{formatNaira(item.priceKobo)}</p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</h3>
        <p className="text-xs text-muted-foreground">
          {locationLabel(item.state, item.city, item.area)}
        </p>
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
      {items.map((item) => (
        <ListingCard key={item.id} item={item} />
      ))}
    </div>
  );
}
