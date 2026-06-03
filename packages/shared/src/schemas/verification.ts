import { z } from 'zod';

export const verificationDocTypeValues = ['ID', 'BUSINESS', 'OTHER'] as const;

export const verificationDocSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(300),
  type: z.enum(verificationDocTypeValues).default('ID'),
});
export type VerificationDoc = z.infer<typeof verificationDocSchema>;

export const applyVerificationSchema = z.object({
  businessName: z.string().trim().max(120).optional(),
  docs: z.array(verificationDocSchema).min(1, 'At least one document is required').max(5),
});
export type ApplyVerificationInput = z.infer<typeof applyVerificationSchema>;

// Admin reject reason.
export const reviewVerificationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;
