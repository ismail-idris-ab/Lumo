'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatNaira } from '@/lib/format';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/stat-card';

// Lazy-load the chart — defers its parse/eval from page bootstrap. Shows skeleton while loading.
const RevenueChart = dynamic(
  () => import('@/components/revenue-chart').then((m) => ({ default: m.RevenueChart })),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" /> },
);

interface AdminAnalytics {
  users: number;
  listings: { total: number; byStatus: Record<string, number>; pendingModeration: number };
  reports: { unresolved: number };
  verifications: { pending: number };
  revenue: { totalKobo: number; last30dKobo: number; successfulPayments: number };
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get<AdminAnalytics>('/admin/analytics'),
  });

  if (isLoading || !data) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Users" value={data.users} />
        <StatCard label="Listings" value={data.listings.total} />
        <StatCard label="Revenue (all-time)" value={formatNaira(data.revenue.totalKobo)} />
        <StatCard label="Revenue (30d)" value={formatNaira(data.revenue.last30dKobo)} />
        <StatCard label="Successful payments" value={data.revenue.successfulPayments} />
      </div>

      <RevenueChart />

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/listings" className="rounded-lg border p-4 hover:bg-accent">
          <p className="text-2xl font-bold">{data.listings.pendingModeration}</p>
          <p className="text-xs text-muted-foreground">Pending moderation →</p>
        </Link>
        <Link href="/admin/reports" className="rounded-lg border p-4 hover:bg-accent">
          <p className="text-2xl font-bold">{data.reports.unresolved}</p>
          <p className="text-xs text-muted-foreground">Unresolved reports →</p>
        </Link>
        <Link href="/admin/verifications" className="rounded-lg border p-4 hover:bg-accent">
          <p className="text-2xl font-bold">{data.verifications.pending}</p>
          <p className="text-xs text-muted-foreground">Verifications to review →</p>
        </Link>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Listings by status</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {Object.entries(data.listings.byStatus).map(([status, count]) => (
            <li key={status} className="rounded-md border px-3 py-1.5">
              <span className="font-medium">{count}</span>{' '}
              <span className="text-muted-foreground">{status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
