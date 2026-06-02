import type { Condition, ListingStatus, Role, VerificationStatus } from './enums';

// API error envelope (CLAUDE.md / TRD §6): { error: { code, message, details } }.
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Public-safe user shape returned by /me, login, register. Never includes passwordHash.
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  roles: Role[];
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl: string | null;
  createdAt: string; // ISO
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  // refresh token is delivered via httpOnly cookie, never in the body.
}

export interface ListingImageDTO {
  id: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
  order: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface SellerSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string; // ISO — drives "account age"
  verification: VerificationStatus | null;
}

export interface PublicListing {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceKobo: number;
  condition: Condition;
  status: ListingStatus;
  state: string;
  city: string;
  area: string | null;
  categoryId: string;
  isPromoted: boolean;
  promotedUntil: string | null;
  expiresAt: string; // ISO
  viewsCount: number;
  createdAt: string; // ISO
  images: ListingImageDTO[];
  category?: CategorySummary;
  seller?: SellerSummary;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
