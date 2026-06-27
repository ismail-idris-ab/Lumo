'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listingStatusValues,
  type ListingStatus,
  type Paginated,
  type PublicListing,
} from '@lumo/shared';
import Image from 'next/image';
import { api } from '@/lib/api-client';
import { formatNaira } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { inputClassName } from '@/components/ui/field';

export default function AdminModerationPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ListingStatus>('PENDING');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-listings', status],
    queryFn: () => api.get<Paginated<PublicListing>>(`/admin/listings?status=${status}`),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-listings'] });

  const act = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
      api.post(`/admin/listings/${id}/${action}`, reason ? { reason } : undefined),
    onSuccess: invalidate,
  });

  const promote = useMutation({
    mutationFn: ({ id, days, tier }: { id: string; days: number; tier: string }) =>
      api.post(`/admin/listings/${id}/promote`, { days, tier }),
    onSuccess: invalidate,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moderation</h1>
        <select className={`${inputClassName} w-40`} value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)}>
          {listingStatusValues.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">Nothing in “{status}”.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((l) => (
            <li key={l.id} className="rounded-lg border p-3">
              <p className="font-medium">{l.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatNaira(l.priceKobo)} · {l.category?.name} · {l.city}, {l.state}
              </p>
              <p className="mt-1 line-clamp-2 text-sm">{l.description}</p>
              {l.images.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {l.images.map((img) => (
                    <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                      <Image
                        src={img.url}
                        alt={l.title}
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-md border object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-destructive">No images</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ id: l.id, action: 'approve' })}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={act.isPending}
                  onClick={() => {
                    const reason = prompt('Reject reason?');
                    if (reason) act.mutate({ id: l.id, action: 'reject', reason });
                  }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={act.isPending}
                  onClick={() => {
                    const reason = prompt('Suspend reason?');
                    if (reason) act.mutate({ id: l.id, action: 'suspend', reason });
                  }}
                >
                  Suspend
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={promote.isPending}
                  onClick={() => {
                    const days = Number(prompt('Promote for how many days?', '30'));
                    if (!days || days < 1 || days > 90) return;
                    const tier = prompt('Tier? BOOST / TOP / DIAMOND / ENTERPRISE', 'BOOST');
                    if (!tier) return;
                    promote.mutate({ id: l.id, days, tier: tier.toUpperCase() });
                  }}
                >
                  {l.isPromoted ? 'Re-promote' : 'Promote'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
