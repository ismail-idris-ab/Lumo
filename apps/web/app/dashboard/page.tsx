import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Protected dashboard — auth guard and seller tools arrive in later phases.
        </p>
      </div>
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
        Back home
      </Link>
    </main>
  );
}
