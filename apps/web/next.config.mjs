import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withSentryConfig } from '@sentry/nextjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lumo/shared'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  // Monorepo: trace files from the workspace root (silences multi-lockfile warning).
  outputFileTracingRoot: path.join(dirname, '../../'),
  // Linting/typechecking run at the workspace root (pnpm lint / typecheck).
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  // Baseline security headers on every response (launch hardening, TRD §security).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

// Wrap with Sentry for PRODUCTION BUILDS ONLY. The Sentry webpack plugin is build-time tooling
// (source-map upload, release tagging) and adds large per-compile overhead — applying it in
// `next dev` made route compiles take 60s+. Dev gets the plain config; the runtime SDK still
// loads via instrumentation*.ts (no-op without a DSN). Source-map upload is opt-in: it only runs
// when SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are set (e.g. on Vercel).
export default process.env.NODE_ENV === 'production'
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      // Upload source maps for readable prod stack traces, then delete them from the build output
      // so original source is never served to the browser.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig;
