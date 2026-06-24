import type {
  Condition,
  ListingStatus,
  PaymentPurpose,
  PaymentStatus,
  PromotionTier,
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
  bio: string | null;
  state: string | null;
  city: string | null;
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
  parentId?: string | null;
  order?: number;
  attributeSchema: AttributeFieldDef[] | null;
  children?: CategorySummary[];
}

export interface SellerSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string; // ISO — drives "account age"
  verification: VerificationStatus | null;
  ratingAvg: number | null;
  ratingCount: number;
  avgReplyHours: number | null;
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
  promotionTier: PromotionTier;
  promotedUntil: string | null;
  expiresAt: string; // ISO
  viewsCount: number;
  todayViews: number;
  createdAt: string; // ISO
  images: ListingImageDTO[];
  attributes: Record<string, unknown> | null;
  marketLowKobo: number | null;
  marketHighKobo: number | null;
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

export interface SellerReviewDTO {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  rating: number;
  body: string | null;
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

export interface SellerPublicProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  state: string | null;
  city: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  verification: VerificationStatus | null;
  ratingAvg: number | null;
  ratingCount: number;
  avgReplyHours: number | null;
  listingCount: number;
}

export interface SavedSearchDTO {
  id: string;
  name: string | null;
  query: string | null;
  categoryId: string | null;
  state: string | null;
  minPriceKobo: number | null;
  maxPriceKobo: number | null;
  condition: Condition | null;
  createdAt: string;
}

export interface PriceWatchDTO {
  watching: boolean;
  priceKobo?: number;
}

// ─── Attribute field schema ───────────────────────────────────────────────────

export type AttributeFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean';

export interface AttributeFieldDef {
  key: string;
  label: string;
  type: AttributeFieldType;
  required?: boolean;
  primary?: boolean;
  format?: string;
  unit?: string;
  placeholder?: string;
  options?: string[];
}

// ─── Search listing ───────────────────────────────────────────────────────────

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
  promotionTier: PromotionTier;
  primaryImage: string | null;
  createdAt: string; // ISO
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  sellerRating: number | null;
  sellerYears: number;
}

// Category x state combo with live inventory — drives SEO landing pages + their sitemap chunk.
export interface LandingCombo {
  categorySlug: string;
  state: string;
  count: number;
}
