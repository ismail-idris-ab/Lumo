'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/user-menu';

export function SiteHeader() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold">
          Lumo
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/search" className="text-muted-foreground hover:text-foreground">
            Browse
          </Link>
          {loading ? null : user ? (
            <>
              <Link href="/dashboard/listings/new" className={cn(buttonVariants({ size: 'sm' }))}>
                Post ad
              </Link>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <UserMenu name={user.name} onLogout={() => void logout()} />
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
