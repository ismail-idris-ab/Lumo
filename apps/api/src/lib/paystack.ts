import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config/env';
import { AppError } from './errors';

export const isPaystackConfigured = Boolean(config.PAYSTACK_SECRET_KEY);

function secret(): string {
  if (!config.PAYSTACK_SECRET_KEY) {
    throw new AppError(503, 'INTERNAL_ERROR', 'Payments are not configured');
  }
  return config.PAYSTACK_SECRET_KEY;
}

export interface InitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResult> {
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo, // Paystack NGN amount is in kobo
      reference: params.reference,
      currency: 'NGN',
      metadata: params.metadata,
    }),
  });
  const json = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };
  if (!res.ok || !json.status || !json.data) {
    throw new AppError(502, 'INTERNAL_ERROR', `Paystack init failed: ${json.message ?? res.status}`);
  }
  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

export interface VerifyResult {
  status: string; // 'success' | 'failed' | 'abandoned' | ...
  amountKobo: number;
  reference: string;
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret()}` } },
  );
  const json = (await res.json()) as {
    status?: boolean;
    data?: { status: string; amount: number; reference: string };
  };
  if (!res.ok || !json.status || !json.data) {
    throw new AppError(502, 'INTERNAL_ERROR', 'Paystack verify failed');
  }
  return { status: json.data.status, amountKobo: json.data.amount, reference: json.data.reference };
}

// Verify webhook authenticity: HMAC-SHA512 of the raw body using the SECRET key (TRD §14).
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature || !config.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac('sha512', config.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
