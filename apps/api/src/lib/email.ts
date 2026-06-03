import { config } from '../config/env';
import { logger } from './logger';
import { prisma } from './prisma';

// Best-effort email via Resend REST API. No-ops (logs) when RESEND_API_KEY is unset.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!config.RESEND_API_KEY) {
    logger.info({ to, subject }, '[email:noop] RESEND_API_KEY unset — would send');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.EMAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, to, subject }, 'Resend email failed');
    }
  } catch (err) {
    logger.warn({ err, to, subject }, 'Resend email error');
  }
}

// Resolve a user's email and send (fire-and-forget friendly).
export async function emailUser(userId: string, subject: string, html: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) await sendEmail(user.email, subject, html);
}
