// Shared constants reused on web + api.

// Standard error envelope codes (CLAUDE.md: { error: { code, message, details } }).
export const ErrorCode = {
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// Auth / password policy.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt byte ceiling; argon2 capped for parity.

// Nigerian phone: +2347012345678 or 07012345678 (MTN/Glo/Airtel/9mobile leading 7/8/9).
export const NG_PHONE_REGEX = /^(\+234|0)[789]\d{9}$/;

// Pagination defaults.
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Sitemap chunking — single source of truth for both the api's slicer and the web's chunk counter.
export const SITEMAP_CHUNK_SIZE = 10_000;

// Listings.
export const LISTING_TTL_DAYS = 30; // auto-expire TTL (PRD §11)
export const LISTING_MAX_IMAGES = 8; // 1–8 images per listing (TRD §12, §22)

// Seller trust-tiered auto-approval (moderation bypass, gated by AUTO_APPROVE_ENABLED).
export const AUTO_APPROVE_MIN_APPROVALS = 3;
export const AUTO_APPROVE_CLEAN_WINDOW_DAYS = 30;

// Post-publish review sample for auto-approved listings (spot-check safety net).
export const SPOTCHECK_FIRST_N = 3;
export const SPOTCHECK_AUTOCLEAR_DAYS = 7;

// Location x category SEO landing pages — inventory floor for indexability (thin-content
// guard) and the static-prerender slice size.
export const LANDING_MIN_LISTINGS = 3;
export const LANDING_TOP_N_PRERENDER = 200;

// Monetisation fixed prices (kobo) — PRD §15. Packages/plans are seeded; these are flat-rate.
export const FEATURED_PRICE_KOBO = 1_000_000; // ₦10,000 / month
export const FEATURED_DAYS = 30;
export const VERIFICATION_FEE_KOBO = 500_000; // ₦5,000
