import { api } from './api-client';
import type { InitiatePaymentInput } from '@lumo/shared';

interface InitiateResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  publicKey: string;
}

// Server-priced init → redirect to Paystack's hosted checkout.
// Fulfilment is webhook-driven (domain rule 6); the return URL just lands the user back in-app.
export async function startCheckout(input: InitiatePaymentInput): Promise<void> {
  const res = await api.post<InitiateResponse>('/payments/initiate', input);
  window.location.href = res.authorizationUrl;
}
