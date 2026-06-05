'use client';

// Root-level error boundary. Required by @sentry/nextjs so React render errors in the root
// layout are reported. Replaces the framework default only when the whole tree fails.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-gray-500">
          An unexpected error occurred. Please try again.
        </p>
        <a href="/" className="text-sm font-medium underline">
          Go home
        </a>
      </body>
    </html>
  );
}
