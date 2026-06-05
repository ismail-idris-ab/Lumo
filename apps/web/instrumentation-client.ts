// Sentry init for the browser (Turbopack-ready replacement for sentry.client.config.ts).
// Uses the PUBLIC DSN (bundled into client JS). No-op when unset.
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Capture navigation timing for client-side route changes.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
