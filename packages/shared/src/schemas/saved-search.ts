import { z } from 'zod';
import { conditionSchema } from '../enums';

export const createSavedSearchSchema = z.object({
  name: z.string().trim().max(60).optional(),
  query: z.string().trim().max(100).optional(),
  categoryId: z.string().cuid().optional(),
  state: z.string().trim().max(60).optional(),
  minPriceKobo: z.number().int().min(0).optional(),
  maxPriceKobo: z.number().int().min(0).optional(),
  condition: conditionSchema.optional(),
});

export type CreateSavedSearchInput = z.infer<typeof createSavedSearchSchema>;
