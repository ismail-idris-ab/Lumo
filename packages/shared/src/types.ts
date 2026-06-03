import type {
  Condition,
  ListingStatus,
  PaymentPurpose,
  PaymentStatus,
  Role,
  VerificationStatus,
} from './enums';

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
  favorited?: boolean; // set when fetched in an authed context
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MessageDTO {
  id: string;
  chatId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface PaymentDTO {
  id: string;
  purpose: PaymentPurpose;
  amountKobo: number;
  status: PaymentStatus;
  reference: string;
  targetId: string | null;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: string;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface ChatSummary {
  id: string;
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  listingImage: string | null;
  otherUser: { id: string; name: string; avatarUrl: string | null };
  lastMessage: MessageDTO | null;
  unreadCount: number;
  createdAt: string;
}

// Lightweight search result card (same shape from Meili or the Postgres fallback).
export interface SearchListing {
  id: string;
  slug: string;
  title: string;
  priceKobo: number;
  condition: Condition;
  state: string;
  city: string;
  area: string | null;
  categorySlug: string;
  categoryName: string;
  isPromoted: boolean;
  primaryImage: string | null;
  createdAt: string; // ISO
}
