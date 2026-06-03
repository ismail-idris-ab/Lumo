'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentStatusValues, type PaymentDTO, type PaymentStatus } from '@lumo/shared';
import { api } from '@/lib/api-client';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  ABANDONED: 'bg-zinc-200 text-zinc-700',
};

const PURPOSE_LABEL: Record<string, string> = {
  PROMOTION: 'Listing promotion',
  SUBSCRIPTION: 'Subscription',
  FEATURED: 'Featured store',
  VERIFICATION: 'Verification fee',
};

type Filter = PaymentStatus | 'ALL';
const FILTERS: Filter[] = ['ALL', ...paymentStatusValues];

export default function AdminPaymentsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', filter],
    queryFn: () =>
      api.get<{ payments: PaymentDTO[] }>(
        `/admin/payments${filter === 'ALL' ? '' : `?status=${filter}`}`,
      ),
  });
  const payments = data?.payments ?? [];
  const totalSuccessKobo = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amountKobo, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <span className="text-sm text-muted-foreground">
          {formatNaira(totalSuccessKobo)} collected (shown)
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm',
              filter === f ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {f === 'ALL' ? 'All' : f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="text-muted-foreground">No payments.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium">{PURPOSE_LABEL[p.purpose] ?? p.purpose}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString('en-NG')} · {p.reference}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium">{formatNaira(p.amountKobo)}</span>
                <span
                  className={cn('rounded px-1.5 py-0.5 text-xs font-medium', STATUS_STYLE[p.status])}
                >
                  {p.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
