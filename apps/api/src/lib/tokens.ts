import jwt from 'jsonwebtoken';
import ms from 'ms';
import { createHash, randomBytes } from 'node:crypto';
import type { Role } from '@lumo/shared';
import { config } from '../config/env';

export interface AccessPayload {
  sub: string;
  roles: Role[];
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: config.ACCESS_TTL });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Malformed access token');
  }
  return { sub: String(decoded.sub), roles: (decoded.roles as Role[]) ?? [] };
}

// Opaque high-entropy refresh token (stored only as a sha256 hash → reuse lookups).
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate(): Date {
  return new Date(Date.now() + ms(config.REFRESH_TTL));
}
