'use client';

import { useQuery } from '@tanstack/react-query';
import type { PaymentDTO, PaymentStatus } from '@lumo/shared';
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

export default function PaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => api.get<{ payments: PaymentDTO[] }>('/payments'),
  });
  const payments = data?.payments ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Payments</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="text-muted-foreground">No payments yet.</p>
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
