import { z } from 'zod';
import { reportReasonSchema } from '../enums';

export const createReportSchema = z.object({
  listingId: z.string().cuid(),
  reason: reportReasonSchema,
  details: z.string().trim().max(500).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

// Admin: resolve all unresolved reports for a listing, optionally acting on it.
export const resolveReportsSchema = z.object({
  listingId: z.string().cuid(),
  action: z.enum(['none', 'suspend', 'delete']).default('none'),
  reason: z.string().trim().max(500).optional(),
});
export type ResolveReportsInput = z.infer<typeof resolveReportsSchema>;
