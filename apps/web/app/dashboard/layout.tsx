'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/listings', label: 'My listings' },
  { href: '/dashboard/listings/new', label: 'Post ad' },
  { href: '/dashboard/favorites', label: 'Favorites' },
  { href: '/dashboard/messages', label: 'Messages' },
  { href: '/dashboard/plans', label: 'Plans & boosts' },
  { href: '/dashboard/payments', label: 'Payments' },
  { href: '/dashboard/verification', label: 'Get verified' },
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
  if (!user) return null; // redirecting

  return (
    <div className="container grid gap-8 py-6 md:grid-cols-[180px_1fr]">
      <aside className="flex gap-1 overflow-x-auto md:flex-col">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-2 text-sm',
                active ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
