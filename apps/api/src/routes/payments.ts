import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { rateLimit } from '../middleware/ratelimit';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { verifyWebhookSignature } from '../lib/paystack';
import { fulfillPayment, initiatePayment, listMyPayments } from '../services/payment.service';

export const paymentsRouter: Router = Router();

// POST /api/v1/payments/webhook — Paystack webhook. NO auth; trust = HMAC signature only.
// Fulfilment is webhook-driven, never client-trusted (CLAUDE.md domain rule 6).
paymentsRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    const raw = req.rawBody ?? Buffer.alloc(0);
    if (!verifyWebhookSignature(raw, typeof signature === 'string' ? signature : undefined)) {
      throw AppError.unauthorized('Invalid webhook signature');
    }
    const event = JSON.parse(raw.toString('utf8')) as {
      event?: string;
      data?: { reference?: string; amount?: number };
    };
    if (event.event === 'charge.success' && event.data?.reference) {
      await fulfillPayment(event.data.reference, event.data.amount ?? -1);
    } else {
      logger.info({ event: event.event }, 'Webhook event ignored');
    }
    res.sendStatus(200); // ack fast
  }),
);

// POST /api/v1/payments/initiate — start a Paystack transaction (login + 10/hr/user).
paymentsRouter.post(
  '/initiate',
  authenticate,
  rateLimit({ name: 'payment-init', windowSec: 3600, max: 10, by: 'user' }),
  asyncHandler(async (req, res) => {
    res.json(await initiatePayment(req.user!, req.body));
  }),
);

// GET /api/v1/payments — current user's payment history.
paymentsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ payments: await listMyPayments(req.user!.id) });
  }),
);
