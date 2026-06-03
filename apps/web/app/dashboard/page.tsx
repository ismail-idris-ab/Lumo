'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { StatCard } from '@/components/stat-card';

interface SellerAnalytics {
  totals: {
    activeListings: number;
    totalListings: number;
    totalViews: number;
    leads: number;
    favorites: number;
  };
  listings: {
    id: string;
    slug: string;
    title: string;
    views: number;
    leads: number;
    favorites: number;
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['seller-analytics'],
    queryFn: () => api.get<SellerAnalytics>('/me/analytics'),
  });
  const t = data?.totals;
  const top = data?.listings.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">Manage your listings, messages, and saved items.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active listings" value={t?.activeListings ?? '—'} />
        <StatCard label="Total views" value={t?.totalViews ?? '—'} />
        <StatCard label="Leads (chats)" value={t?.leads ?? '—'} />
        <StatCard label="Saves" value={t?.favorites ?? '—'} />
      </div>

      {top.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Top listings</h2>
          <ul className="divide-y rounded-lg border">
            {top.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <Link href={`/listing/${l.slug}`} className="min-w-0 truncate font-medium hover:underline">
                  {l.title}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {l.views} views · {l.leads} leads · {l.favorites} saves
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: '/dashboard/listings/new', title: 'Post a new ad', desc: 'List an item in minutes.' },
          { href: '/dashboard/listings', title: 'My listings', desc: 'View status & manage.' },
          { href: '/dashboard/messages', title: 'Messages', desc: 'Chat with buyers & sellers.' },
          { href: '/dashboard/favorites', title: 'Favorites', desc: 'Items you saved.' },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
