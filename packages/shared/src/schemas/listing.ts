import { z } from 'zod';
import { conditionSchema } from '../enums';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants';

// Fields a seller controls. status/slug/expiresAt/owner are server-managed.
export const createListingSchema = z.object({
  title: z.string().trim().min(3, 'Title is too short').max(100),
  description: z.string().trim().min(10, 'Description is too short').max(5000),
  priceKobo: z.number().int('Price must be whole kobo').min(0).max(1_000_000_000_00),
  condition: conditionSchema.default('USED'),
  categoryId: z.string().cuid(),
  state: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().max(60).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

// Any of these edits is "material" → listing re-enters PENDING (PRD §11).
export const updateListingSchema = createListingSchema.partial();
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const listingSortValues = ['newest', 'price_asc', 'price_desc'] as const;
export const listingSortSchema = z.enum(listingSortValues);
export type ListingSort = z.infer<typeof listingSortSchema>;

// Public browse filters (TRD §6 ?page&limit). z.coerce → values arrive as query strings.
export const listingQuerySchema = z.object({
  categorySlug: z.string().trim().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  condition: conditionSchema.optional(),
  minPriceKobo: z.coerce.number().int().min(0).optional(),
  maxPriceKobo: z.coerce.number().int().min(0).optional(),
  q: z.string().trim().max(100).optional(),
  sort: listingSortSchema.default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListingQuery = z.infer<typeof listingQuerySchema>;
