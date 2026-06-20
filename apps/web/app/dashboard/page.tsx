'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';

interface SellerAnalytics {
  totals: {
    activeListings: number;
    totalListings: number;
    totalViews: number;
    leads: number;
    contacts: number;
    favorites: number;
  };
  listings: {
    id: string;
    slug: string;
    title: string;
    views: number;
    leads: number;
    contacts: number;
    favorites: number;
  }[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent = false,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        accent ? 'border-emerald-200' : 'border-slate-100'
      }`}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-emerald-400 to-emerald-600" />
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${
            accent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
          }`}
        >
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-3xl font-black tracking-tight ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>
        {typeof value === 'number' ? fmt(value) : value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Mini bar ──────────────────────────────────────────────────────────────────

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-semibold text-slate-700">{fmt(value)}</span>
    </div>
  );
}

// ── Quick action card ─────────────────────────────────────────────────────────

function ActionCard({
  href,
  icon,
  title,
  desc,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border p-4 transition-all hover:shadow-md ${
        primary
          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
          : 'border-slate-100 bg-white hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-transform group-hover:scale-110 ${
          primary ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${primary ? 'text-emerald-900' : 'text-slate-800'}`}>{title}</p>
        <p className="truncate text-xs text-slate-500">{desc}</p>
      </div>
      <svg
        className="ml-auto shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400"
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['seller-analytics'],
    queryFn: () => api.get<SellerAnalytics>('/me/analytics'),
  });

  const t = data?.totals;
  const listings = data?.listings ?? [];
  const maxViews = Math.max(...listings.map((l) => l.views), 1);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{greeting}</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {firstName}<span className="text-emerald-600">.</span>
          </h1>
        </div>
        <Link
          href="/dashboard/listings/new"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-md active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Post new ad
        </Link>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Active ads"
          value={isLoading ? '—' : (t?.activeListings ?? 0)}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
          sub={t ? `of ${t.totalListings} total` : undefined}
          accent
        />
        <StatCard
          label="Total views"
          value={isLoading ? '—' : (t?.totalViews ?? 0)}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        />
        <StatCard
          label="Leads"
          value={isLoading ? '—' : (t?.leads ?? 0)}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          sub="buyer chats"
        />
        <StatCard
          label="Contacts"
          value={isLoading ? '—' : (t?.contacts ?? 0)}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
          sub="phone reveals"
        />
        <StatCard
          label="Saves"
          value={isLoading ? '—' : (t?.favorites ?? 0)}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
          sub="wishlisted"
        />
      </div>

      {/* ── Top listings ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Performance</p>
            <h2 className="text-sm font-bold text-slate-800">Top listings</h2>
          </div>
          <Link
            href="/dashboard/listings"
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View all
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>

        {isLoading ? (
          <div className="divide-y divide-slate-50">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
                <div className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="text-3xl">📭</span>
            <p className="text-sm text-slate-400">No listings yet</p>
            <Link href="/dashboard/listings/new" className="text-xs font-semibold text-emerald-600 hover:underline">
              Post your first ad →
            </Link>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-3 border-b border-slate-50 px-5 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Listing</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right hidden sm:block">Views</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right hidden sm:block">Leads</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right hidden sm:block">Contacts</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right hidden sm:block">Saves</span>
            </div>

            <div className="divide-y divide-slate-50">
              {listings.slice(0, 6).map((l, i) => (
                <Link
                  key={l.id}
                  href={`/listing/${l.slug}`}
                  className="grid grid-cols-[1fr_80px_80px_80px_80px] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
                >
                  {/* Rank + title */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-400">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-slate-800">{l.title}</span>
                  </div>
                  {/* Metrics */}
                  <div className="hidden sm:flex justify-end">
                    <MiniBar value={l.views} max={maxViews} />
                  </div>
                  <span className="hidden sm:block text-right text-xs font-semibold text-slate-600">{fmt(l.leads)}</span>
                  <span className="hidden sm:block text-right text-xs font-semibold text-slate-600">{fmt(l.contacts)}</span>
                  <span className="hidden sm:block text-right text-xs font-semibold text-slate-600">{fmt(l.favorites)}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Quick actions ───────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick actions</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <ActionCard
            href="/dashboard/listings/new"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>}
            title="Post a new ad"
            desc="List an item in minutes — reaches thousands of buyers"
            primary
          />
          <ActionCard
            href="/dashboard/listings"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
            title="Manage listings"
            desc="Edit, renew, or promote your active ads"
          />
          <ActionCard
            href="/dashboard/messages"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            title="Messages"
            desc="Reply to buyers interested in your items"
          />
          <ActionCard
            href="/dashboard/verification"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            title="Get verified"
            desc="Verified sellers get 3× more buyer trust"
          />
        </div>
      </div>

    </div>
  );
}
