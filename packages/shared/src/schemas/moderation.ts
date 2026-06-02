import { z } from 'zod';
import { listingStatusSchema } from '../enums';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants';

// Reject / suspend require a reason (seller is notified with it).
export const moderationReasonSchema = z.object({
  reason: z.string().trim().min(3, 'Reason is required').max(500),
});
export type ModerationReasonInput = z.infer<typeof moderationReasonSchema>;

export const requestChangesSchema = z.object({
  note: z.string().trim().min(3, 'A note is required').max(500),
});
export type RequestChangesInput = z.infer<typeof requestChangesSchema>;

// Admin moderation queue filters.
export const adminListingQuerySchema = z.object({
  status: listingStatusSchema.optional(),
  categorySlug: z.string().trim().optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type AdminListingQuery = z.infer<typeof adminListingQuerySchema>;
