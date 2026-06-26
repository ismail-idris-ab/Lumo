import { z } from 'zod';
import { applicationStatusSchema } from '../enums';

// Public submission from /careers — no account required.
export const submitStaffApplicationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  message: z.string().trim().max(2000).optional(),
});
export type SubmitStaffApplication = z.infer<typeof submitStaffApplicationSchema>;

export interface StaffApplicationDTO {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: z.infer<typeof applicationStatusSchema>;
  createdAt: string;
  reviewedAt: string | null;
}
