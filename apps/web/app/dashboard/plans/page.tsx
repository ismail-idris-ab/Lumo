'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FEATURED_DAYS, FEATURED_PRICE_KOBO } from '@lumo/shared';
import { api, ApiError } from '@/lib/api-client';
import { startCheckout } from '@/lib/checkout';
import { formatNaira } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface SubscriptionPlan {
  id: string;
  name: string;
  priceKobo: number;
  listingLimit: number;
  promoCredits: number;
  features: unknown;
}

export default function PlansPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => api.get<{ plans: SubscriptionPlan[] }>('/subscriptions/plans'),
  });
  const plans = data?.plans ?? [];

  async function subscribe(planId: string) {
    setError(null);
    setBusy(planId);
    try {
      await startCheckout({ purpose: 'SUBSCRIPTION', planId });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start payment');
      setBusy(null);
    }
  }

  async function feature() {
    setError(null);
    setBusy('featured');
    try {
      await startCheckout({ purpose: 'FEATURED' });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start payment');
      setBusy(null);
    }
  }

  const featureList = (p: SubscriptionPlan): string[] =>
    Array.isArray(p.features) ? (p.features as unknown[]).map(String) : [];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Plans &amp; boosts</h1>
        <p className="text-sm text-muted-foreground">
          Subscribe for higher listing limits and promo credits, or feature your store.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subscription plans</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="text-muted-foreground">No plans available right now.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className="flex flex-col rounded-lg border p-4">
                <p className="font-semibold">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{formatNaira(p.priceKobo)}</p>
                <p className="text-xs text-muted-foreground">per month</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>{p.listingLimit} active listings</li>
                  <li>{p.promoCredits} promo credits</li>
                  {featureList(p).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  disabled={busy !== null}
                  onClick={() => subscribe(p.id)}
                >
                  {busy === p.id ? 'Redirecting…' : 'Subscribe'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Featured store</h2>
        <div className="flex flex-col items-start gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Feature your store for {FEATURED_DAYS} days</p>
            <p className="text-sm text-muted-foreground">
              Appear in featured placements across Lumo. {formatNaira(FEATURED_PRICE_KOBO)}.
            </p>
          </div>
          <Button disabled={busy !== null} onClick={feature}>
            {busy === 'featured' ? 'Redirecting…' : 'Feature my store'}
          </Button>
        </div>
      </section>
    </div>
  );
}
