import { z } from 'zod';

// Staff role management — SUPER_ADMIN-only (promote/demote ADMIN/SUPER_ADMIN from /admin/staff).
const staffRoleValues = ['ADMIN', 'SUPER_ADMIN'] as const;

export const staffRoleActionSchema = z.object({
  role: z.enum(staffRoleValues),
});
export type StaffRoleAction = z.infer<typeof staffRoleActionSchema>;

export const staffEmailQuerySchema = z.object({
  email: z.string().trim().email(),
});
export type StaffEmailQuery = z.infer<typeof staffEmailQuerySchema>;

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
}
