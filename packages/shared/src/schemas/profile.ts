import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  bio: z.string().trim().max(300).optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  state: z.string().trim().max(60).optional().or(z.literal('')),
  city: z.string().trim().max(60).optional().or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
