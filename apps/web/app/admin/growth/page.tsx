'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { inputClassName } from '@/components/ui/field';

interface EarlyAdopterGrantResult {
  usersConsidered: number;
  promoted: { userId: string; listingId: string }[];
  verified: { userId: string }[];
  skipped: { userId: string; reason: string }[];
}

const TIERS = ['BOOST', 'TOP', 'DIAMOND', 'ENTERPRISE'] as const;

export default function AdminGrowthPage() {
  const [count, setCount] = useState(50);
  const [promoDays, setPromoDays] = useState(30);
  const [promotionTier, setPromotionTier] = useState<(typeof TIERS)[number]>('BOOST');

  const grant = useMutation({
    mutationFn: () =>
      api.post<EarlyAdopterGrantResult>('/admin/growth/early-adopters', {
        count,
        promoDays,
        promotionTier,
      }),
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Growth — early adopters</h1>
        <p className="text-sm text-muted-foreground">
          One-off campaign: free promotion + free verification for the earliest signups. Safe to
          re-run — users already granted are skipped.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <label className="block text-sm font-medium">
          Number of users (earliest signups with a listing)
          <input
            type="number"
            min={1}
            max={500}
            className={`${inputClassName} mt-1`}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-medium">
          Promotion length (days)
          <input
            type="number"
            min={1}
            max={90}
            className={`${inputClassName} mt-1`}
            value={promoDays}
            onChange={(e) => setPromoDays(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-medium">
          Promotion tier
          <select
            className={`${inputClassName} mt-1`}
            value={promotionTier}
            onChange={(e) => setPromotionTier(e.target.value as (typeof TIERS)[number])}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={grant.isPending} onClick={() => grant.mutate()}>
          {grant.isPending ? 'Granting…' : `Grant to first ${count} users`}
        </Button>
      </div>

      {grant.data ? (
        <div className="rounded-lg border p-4 text-sm">
          <p>Users considered: {grant.data.usersConsidered}</p>
          <p>Promoted: {grant.data.promoted.length}</p>
          <p>Verified: {grant.data.verified.length}</p>
          <p>Skipped (already granted): {grant.data.skipped.length}</p>
        </div>
      ) : null}
      {grant.isError ? (
        <p className="text-sm text-destructive">{(grant.error as Error).message}</p>
      ) : null}
    </div>
  );
}
