import { z } from 'zod';

// Admin revenue chart range. Omitted → 30. Present-but-invalid (e.g. 15, "abc") → ZodError → 400.
export const adminRevenueQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .default(30)
    .refine((n) => [7, 30, 90].includes(n), { message: 'days must be 7, 30, or 90' }),
});
export type AdminRevenueQuery = z.infer<typeof adminRevenueQuerySchema>;

// One day's bucketed revenue. Money is integer kobo (₦ × 100).
export interface RevenuePoint {
  date: string; // YYYY-MM-DD, Africa/Lagos (WAT) calendar day
  totalKobo: number;
  count: number; // number of SUCCESS payments that day
}

export interface RevenueSeries {
  days: number;
  series: RevenuePoint[]; // ascending by date, zero-filled, length === days
}
