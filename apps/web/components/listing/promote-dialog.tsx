'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { startCheckout } from '@/lib/checkout';
import { formatNaira } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface PromotionPackage {
  id: string;
  name: string;
  days: number;
  priceKobo: number;
  tier: 'BOOST' | 'TOP' | 'DIAMOND' | 'ENTERPRISE';
}

export function PromoteDialog({
  listingId,
  listingTitle,
  onClose,
}: {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['promo-packages'],
    queryFn: () => api.get<{ packages: PromotionPackage[] }>('/promotions/packages'),
  });
  const packages = data?.packages ?? [];

  async function pick(packageId: string) {
    setError(null);
    setBusy(packageId);
    try {
      await startCheckout({ purpose: 'PROMOTION', listingId, packageId });
      // startCheckout redirects on success; if it returns we never reach here.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start payment');
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-lg bg-background p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Promote listing</h2>
          <p className="truncate text-sm text-muted-foreground">{listingTitle}</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading packages…</p>
        ) : packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No promotion packages available right now.</p>
        ) : (
          <ul className="space-y-2">
            {packages.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.days} day{p.days === 1 ? '' : 's'} · {p.tier} tier visibility
                  </p>
                </div>
                <Button size="sm" disabled={busy !== null} onClick={() => pick(p.id)}>
                  {busy === p.id ? '…' : formatNaira(p.priceKobo)}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button variant="outline" className="w-full" onClick={onClose} disabled={busy !== null}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
