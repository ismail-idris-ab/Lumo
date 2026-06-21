'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',              label: 'Overview',      icon: '▦' },
  { href: '/dashboard/settings',     label: 'Settings',      icon: '◉' },
  { href: '/dashboard/listings',     label: 'My listings',   icon: '☰' },
  { href: '/dashboard/listings/new', label: 'Post ad',       icon: '+', highlight: true },
  { href: '/dashboard/favorites',    label: 'Favorites',     icon: '♡' },
  { href: '/dashboard/messages',     label: 'Messages',      icon: '✉' },
  { href: '/dashboard/plans',        label: 'Plans',         icon: '⚡' },
  { href: '/dashboard/payments',     label: 'Payments',      icon: '₦' },
  { href: '/dashboard/saved-searches', label: 'Saved searches', icon: '🔖' },
  { href: '/dashboard/verification',   label: 'Get verified',   icon: '✔' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, pathname, router]);

  if (loading) {
    return <div className="container py-16 text-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="container">
          {/* User strip */}
          <div className="flex items-center gap-2 border-b border-slate-100 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-800 truncate">{user.name}</span>
            <span className="ml-auto text-xs text-slate-400 shrink-0">My dashboard</span>
          </div>

          {/* Nav tabs — scrollable on mobile */}
          <nav
            className="flex gap-0.5 overflow-x-auto scrollbar-none py-1"
            aria-label="Dashboard navigation"
          >
            {NAV.map((item) => {
              const active = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

              if (item.highlight) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'ml-1 flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                    )}
                  >
                    <span className="text-sm leading-none font-bold">+</span>
                    Post ad
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                  )}
                >
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-emerald-500" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}
