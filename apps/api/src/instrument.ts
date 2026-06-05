// Sentry initialisation. MUST be imported before Express / the HTTP server so the SDK can
// auto-instrument them (v10 requirement). Entrypoints import this as their very first line.
// No-op when SENTRY_DSN is unset, so local dev and tests stay quiet.
import * as Sentry from '@sentry/node';
import { config } from './config/env';

if (config.SENTRY_DSN) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    // Conservative perf sampling — bump once we have real traffic baselines.
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
