import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function HomePage() {
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-8 py-16 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Lumo</h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          The trusted local marketplace for verified Nigerian sellers.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/register" className={cn(buttonVariants())}>
          Get started
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }))}>
          Log in
        </Link>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost' }))}>
          Dashboard
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Phase 0 skeleton — features land in later phases.
      </p>
    </main>
  );
}
