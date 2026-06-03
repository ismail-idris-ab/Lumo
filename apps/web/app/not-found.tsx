import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <main className="container flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-5xl font-bold">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page or listing you’re looking for doesn’t exist, or may have expired or been removed.
      </p>
      <div className="flex gap-2">
        <Link href="/" className={cn(buttonVariants())}>
          Go home
        </Link>
        <Link href="/search" className={cn(buttonVariants({ variant: 'outline' }))}>
          Browse listings
        </Link>
      </div>
    </main>
  );
}
