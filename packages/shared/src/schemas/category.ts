import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60),
  slug: z
    .string()
    .trim()
    .regex(slugPattern, 'Slug must be lowercase kebab-case')
    .max(80)
    .optional(),
  parentId: z.string().cuid().optional(),
  order: z.number().int().min(0).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
