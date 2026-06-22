'use client';

import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/user-menu';
import { NavIconLink } from '@/components/nav-icon-link';
import { NotificationBell } from '@/components/notification-bell';
import { useUnreadMessages } from '@/lib/use-unread-messages';

export function SiteHeader() {
  const { user, loading, logout } = useAuth();
  const unreadMessages = useUnreadMessages(!!user);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold">
          Lumo
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {loading ? null : user ? (
            <>
              <div className="hidden items-center gap-1.5 sm:flex">
                <NavIconLink href="/dashboard/favorites" label="Favorites" icon={Heart} tone="rose" />
                <NavIconLink
                  href="/dashboard/messages"
                  label="Messages"
                  icon={MessageCircle}
                  tone="blue"
                  badge={unreadMessages}
                />
              </div>
              <NotificationBell />
              <span className="hidden sm:inline-flex">
                <Link
                  href="/dashboard/listings/new"
                  className={cn(buttonVariants({ size: 'sm' }), 'mr-1')}
                >
                  Post ad
                </Link>
              </span>
              <UserMenu name={user.name} avatarUrl={user.avatarUrl} onLogout={() => void logout()} />
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Log in
              </Link>
              <Link href="/register" className={cn(buttonVariants({ size: 'sm' }))}>
                Sell
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
