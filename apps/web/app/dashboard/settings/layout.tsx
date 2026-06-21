'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, User, Mail, KeyRound, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { href: '/dashboard/settings', label: 'Personal details', icon: User },
  { href: '/dashboard/settings/email', label: 'Change email', icon: Mail },
  { href: '/dashboard/settings/password', label: 'Change password', icon: KeyRound },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
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
            href="/dashboard/settings/delete"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive',
              pathname === '/dashboard/settings/delete' ? 'bg-destructive/10 font-medium' : 'hover:bg-destructive/10',
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
