import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Load apps/api/.env into process.env (cwd is apps/api when run via pnpm --filter).
loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL: z.string().default('30d'),
  COOKIE_DOMAIN: z.string().default('localhost'),

  // Comma-separated allow-list for CORS.
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RATE_LIMIT_REDIS_PREFIX: z.string().default('lumo:rl:'),

  // Search (optional at boot; search degrades to Postgres if unset).
  SEARCH_HOST: z.string().url().optional(),
  SEARCH_API_KEY: z.string().optional(),

  // Email (optional; sending is best-effort — logs when unset).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Lumo <onboarding@resend.dev>'),

  // Images (optional at boot; image endpoints fail clearly if unset).
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Payments (optional at boot; payment endpoints fail clearly if unset).
  // Paystack signs webhooks with the SECRET key (HMAC-SHA512); WEBHOOK_SECRET is an optional override.
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

  // Monitoring (optional; error reporting is a no-op when unset).
  SENTRY_DSN: z.string().url().optional(),

  // Seller trust-tiered auto-approval kill switch (moderation bypass) — off by default.
  AUTO_APPROVE_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  // Post-publish review sample for auto-approved listings — left unparsed-boolean here
  // (resolved against AUTO_APPROVE_ENABLED below) since its default depends on another field.
  SPOTCHECK_ENABLED: z.enum(['true', 'false']).optional(),
  SPOTCHECK_RATE_VERIFIED: z.coerce.number().min(0).max(1).default(0.05),
  SPOTCHECK_RATE_TRACK_RECORD: z.coerce.number().min(0).max(1).default(0.2),
  SPOTCHECK_EDIT_FLOOR: z.coerce.number().min(0).max(1).default(0.25),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast on misconfiguration — never boot with bad config.
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

export const config = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isDev: raw.NODE_ENV === 'development',
  corsOrigins: raw.CORS_ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Defaults to AUTO_APPROVE_ENABLED when unset — spot-checking only ever matters
  // alongside auto-approval, so it should track the same kill switch by default.
  SPOTCHECK_ENABLED: raw.SPOTCHECK_ENABLED !== undefined ? raw.SPOTCHECK_ENABLED === 'true' : raw.AUTO_APPROVE_ENABLED,
} as const;

export type AppConfig = typeof config;
