'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ListingForm } from '@/components/listing/listing-form';

export default function NewListingPage() {
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
    <div className="container space-y-5 py-6">
      <h1 className="text-2xl font-bold">Post a new ad</h1>
      <ListingForm />
    </div>
  );
}
