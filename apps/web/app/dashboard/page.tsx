'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">Manage your listings, messages, and saved items.</p>
      </div>
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
