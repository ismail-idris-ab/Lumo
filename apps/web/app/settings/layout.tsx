'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChevronLeft, User, Mail, KeyRound, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { href: '/settings', label: 'Personal details', icon: User },
  { href: '/settings/email', label: 'Change email', icon: Mail },
  { href: '/settings/password', label: 'Change password', icon: KeyRound },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
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
    <div className="container flex flex-col gap-6 py-6 sm:flex-row">
      <aside className="shrink-0 sm:w-56">
        <Link
          href="/dashboard"
          className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="mb-2 text-lg font-bold">Settings</h1>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => {
            const active = pathname === s.href;
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                  active
                    ? 'bg-emerald-50 font-medium text-emerald-700'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {s.label}
              </Link>
            );
          })}
          <div className="my-1 border-t" />
          <Link
            href="/settings/delete"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive',
              pathname === '/settings/delete' ? 'bg-destructive/10 font-medium' : 'hover:bg-destructive/10',
            )}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Delete account
          </Link>
        </nav>
      </aside>

      <div className="flex-1">{children}</div>
    </div>
  );
}
