'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListingStatus, PublicListing } from '@lumo/shared';
import { api } from '@/lib/api-client';
import { formatNaira } from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { PromoteDialog } from '@/components/listing/promote-dialog';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<ListingStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-zinc-200 text-zinc-700',
  SOLD: 'bg-blue-100 text-blue-800',
  DELETED: 'bg-zinc-200 text-zinc-700',
};

export default function MyListingsPage() {
  const qc = useQueryClient();
  const [promote, setPromote] = useState<PublicListing | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => api.get<{ listings: PublicListing[] }>('/listings/mine'),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-listings'] });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/listings/${id}`),
    onSuccess: invalidate,
  });
  const sold = useMutation({
    mutationFn: (id: string) => api.post(`/listings/${id}/sold`),
    onSuccess: invalidate,
  });

  const listings = data?.listings ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My listings</h1>
        <Link href="/new" className={cn(buttonVariants({ size: 'sm' }))}>
          Post ad
        </Link>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="text-muted-foreground">No listings yet. Post your first ad.</p>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id} className="flex gap-3 rounded-lg border p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
                {l.images[0] ? (
                  <Image
                    src={l.images[0].url}
                    alt={l.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-xs font-medium',
                      STATUS_STYLE[l.status],
                    )}
                  >
                    {l.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{l.viewsCount} views</span>
                  {l.status === 'APPROVED' &&
                    (() => {
                      const ageDays = Math.floor(
                        (Date.now() - new Date(l.createdAt).getTime()) / 86400000,
                      );
                      return ageDays >= 15 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {ageDays}d old — still active?
                        </span>
                      ) : null;
                    })()}
                </div>
                <p className="truncate font-medium">{l.title}</p>
                <p className="text-sm text-primary">{formatNaira(l.priceKobo)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Link
                  href={`/dashboard/listings/${l.id}/edit`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Edit
                </Link>
                {l.status === 'APPROVED' && (
                  <Button variant="secondary" size="sm" onClick={() => setPromote(l)}>
                    {l.isPromoted ? 'Boosted ✓' : 'Promote'}
                  </Button>
                )}
                {(l.status === 'APPROVED' || l.status === 'PENDING') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={sold.isPending}
                    onClick={() => sold.mutate(l.id)}
                  >
                    Mark sold
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={del.isPending}
                  onClick={() => {
                    if (confirm('Delete this listing?')) del.mutate(l.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {promote && (
        <PromoteDialog
          listingId={promote.id}
          listingTitle={promote.title}
          onClose={() => setPromote(null)}
        />
      )}
    </div>
  );
}
