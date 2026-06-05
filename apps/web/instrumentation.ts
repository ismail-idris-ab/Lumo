// Next.js instrumentation hook — loads the Sentry config for the active runtime, and forwards
// nested React Server Component errors to Sentry via onRequestError.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Skip Sentry entirely without a DSN (e.g. local dev). Loading it pulls in OpenTelemetry
  // auto-instrumentation (import/require-in-the-middle) which pnpm doesn't hoist to the project
  // root — under Turbopack that emits "can't be external" warnings and adds ~26s to boot, all for
  // a no-op SDK. Production sets the DSN, so this only short-circuits dev.
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
