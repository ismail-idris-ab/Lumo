import { z } from 'zod';

// Client posts back what Cloudinary returned after a signed direct upload.
export const attachImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(300),
  isPrimary: z.boolean().optional(),
});
export type AttachImageInput = z.infer<typeof attachImageSchema>;
