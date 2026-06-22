'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Plus, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard/favorites', label: 'Saved', icon: Heart },
  { href: '/dashboard/messages', label: 'Chat', icon: MessageCircle },
  { href: '/settings', label: 'Profile', icon: User },
];

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.slice(0, 2).map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center justify-center gap-0.5 py-2"
          >
            <Icon
              className={cn('h-5 w-5', active ? 'text-emerald-600' : 'text-slate-400')}
              strokeWidth={active ? 2.5 : 2}
            />
            <span
              className={cn(
                'text-[11px]',
                active ? 'font-semibold text-emerald-700' : 'text-slate-500',
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}

      <Link
        href="/dashboard/listings/new"
        aria-label="Post ad"
        className="relative flex flex-col items-center justify-end pb-1.5"
      >
        <span className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-background transition-transform active:scale-95">
          <Plus className="h-7 w-7" />
        </span>
        <span className="mt-8 text-[11px] font-semibold text-emerald-700">Sell</span>
      </Link>

      {TABS.slice(2).map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center justify-center gap-0.5 py-2"
          >
            <Icon
              className={cn('h-5 w-5', active ? 'text-emerald-600' : 'text-slate-400')}
              strokeWidth={active ? 2.5 : 2}
            />
            <span
              className={cn(
                'text-[11px]',
                active ? 'font-semibold text-emerald-700' : 'text-slate-500',
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
