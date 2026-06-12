import { z } from 'zod';

// Enums mirror apps/api/prisma/schema.prisma (TRD §10). Keep in sync.
// Pattern: define value tuple → derive zod enum + TS type. No parallel unions.

export const roleValues = ['BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'] as const;
export const roleSchema = z.enum(roleValues);
export type Role = z.infer<typeof roleSchema>;

export const listingStatusValues = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'EXPIRED',
  'SOLD',
  'DELETED',
] as const;
export const listingStatusSchema = z.enum(listingStatusValues);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const conditionValues = ['NEW', 'USED', 'FOR_PARTS'] as const;
export const conditionSchema = z.enum(conditionValues);
export type Condition = z.infer<typeof conditionSchema>;

export const verificationStatusValues = ['NONE', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
export const verificationStatusSchema = z.enum(verificationStatusValues);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const paymentPurposeValues = [
  'PROMOTION',
  'SUBSCRIPTION',
  'VERIFICATION',
  'FEATURED',
] as const;
export const paymentPurposeSchema = z.enum(paymentPurposeValues);
export type PaymentPurpose = z.infer<typeof paymentPurposeSchema>;

export const paymentStatusValues = ['PENDING', 'SUCCESS', 'FAILED', 'ABANDONED'] as const;
export const paymentStatusSchema = z.enum(paymentStatusValues);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const reportReasonValues = [
  'SCAM',
  'PROHIBITED',
  'DUPLICATE',
  'MISCATEGORISED',
  'ALREADY_SOLD',
  'OTHER',
] as const;
export const reportReasonSchema = z.enum(reportReasonValues);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const promotionTierValues = ['NONE', 'BOOST', 'TOP', 'DIAMOND', 'ENTERPRISE'] as const;
export const promotionTierSchema = z.enum(promotionTierValues);
export type PromotionTier = z.infer<typeof promotionTierSchema>;
