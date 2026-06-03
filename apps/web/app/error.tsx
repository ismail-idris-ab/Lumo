'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for client-side error reporting; details are not shown to the user.
    console.error(error);
  }, [error]);

  return (
    <main className="container flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Please try again — if it keeps happening, come back shortly.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
