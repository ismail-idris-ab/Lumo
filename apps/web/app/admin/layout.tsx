'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/listings', label: 'Moderation' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/verifications', label: 'Verifications' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/staff', label: 'Staff' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = !!user?.roles.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!isAdmin) router.replace('/');
  }, [loading, user, isAdmin, pathname, router]);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading…</div>;
  if (!user || !isAdmin) return null;

  return (
    <div className="container grid gap-8 py-6 md:grid-cols-[180px_1fr]">
      <aside className="flex gap-1 overflow-x-auto md:flex-col">
        <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Admin</p>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-2 text-sm',
              pathname === item.href ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {item.label}
          </Link>
        ))}
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
