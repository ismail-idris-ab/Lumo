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
} as const;

export type AppConfig = typeof config;
