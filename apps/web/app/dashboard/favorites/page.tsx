'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicListing } from '@lumo/shared';
import { api } from '@/lib/api-client';
import { formatNaira, locationLabel } from '@/lib/format';
import { Button } from '@/components/ui/button';

export default function FavoritesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<{ listings: PublicListing[] }>('/favorites'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/favorites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const listings = data?.listings ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Saved listings</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="text-muted-foreground">
          No saved items yet. <Link href="/search" className="text-primary underline-offset-4 hover:underline">Browse listings</Link>.
        </p>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => {
            const unavailable = l.status !== 'APPROVED';
            return (
              <li key={l.id} className="flex gap-3 rounded-lg border p-3">
                <Link href={`/listing/${l.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
                  {l.images[0] ? (
                    <Image src={l.images[0].url} alt={l.title} fill sizes="80px" className="object-cover" />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/listing/${l.slug}`} className="truncate font-medium hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-primary">{formatNaira(l.priceKobo)}</p>
                  <p className="text-xs text-muted-foreground">
                    {locationLabel(l.state, l.city, l.area)}
                    {unavailable && ' · no longer available'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(l.id)}>
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
