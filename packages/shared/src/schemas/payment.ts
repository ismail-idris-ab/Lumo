import { z } from 'zod';

// Payment init is server-priced — the client only says WHAT it's paying for, never how much.
export const initiatePaymentSchema = z.discriminatedUnion('purpose', [
  z.object({
    purpose: z.literal('PROMOTION'),
    listingId: z.string().cuid(),
    packageId: z.string().cuid(),
  }),
  z.object({ purpose: z.literal('SUBSCRIPTION'), planId: z.string().cuid() }),
  z.object({ purpose: z.literal('FEATURED') }),
  z.object({ purpose: z.literal('VERIFICATION'), requestId: z.string().cuid().optional() }),
]);
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
