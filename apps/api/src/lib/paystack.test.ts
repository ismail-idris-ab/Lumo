import { createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { verifyWebhookSignature } from './paystack';

// Mirrors how Paystack signs webhooks: HMAC-SHA512 of the RAW body with the secret key.
const SECRET = process.env.PAYSTACK_SECRET_KEY!;
const sign = (body: Buffer) => createHmac('sha512', SECRET).update(body).digest('hex');

describe('verifyWebhookSignature', () => {
  const body = Buffer.from(
    JSON.stringify({ event: 'charge.success', data: { reference: 'ref_1', amount: 50000 } }),
  );

  it('accepts a correctly signed body', () => {
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it('rejects a wrong signature', () => {
    expect(verifyWebhookSignature(body, 'deadbeef')).toBe(false);
  });

  it('rejects a valid signature over a tampered body (amount changed)', () => {
    const sig = sign(body);
    const tampered = Buffer.from(
      JSON.stringify({ event: 'charge.success', data: { reference: 'ref_1', amount: 999999 } }),
    );
    expect(verifyWebhookSignature(tampered, sig)).toBe(false);
  });

  it('rejects a missing signature', () => {
    expect(verifyWebhookSignature(body, undefined)).toBe(false);
  });

  it('rejects a signature signed with the wrong secret', () => {
    const forged = createHmac('sha512', 'attacker-secret').update(body).digest('hex');
    expect(verifyWebhookSignature(body, forged)).toBe(false);
  });
});
