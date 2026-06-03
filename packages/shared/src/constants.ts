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

// Listings.
export const LISTING_TTL_DAYS = 30; // auto-expire TTL (PRD §11)
export const LISTING_MAX_IMAGES = 8; // 1–8 images per listing (TRD §12, §22)

// Monetisation fixed prices (kobo) — PRD §15. Packages/plans are seeded; these are flat-rate.
export const FEATURED_PRICE_KOBO = 1_000_000; // ₦10,000 / month
export const FEATURED_DAYS = 30;
export const VERIFICATION_FEE_KOBO = 500_000; // ₦5,000
