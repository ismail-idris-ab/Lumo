import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Role } from '@lumo/shared';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
} from './tokens';

const roles: Role[] = ['SELLER'];

describe('access tokens', () => {
  it('round-trips sub + roles through sign → verify', () => {
    const token = signAccessToken({ sub: 'user_1', roles });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user_1');
    expect(payload.roles).toEqual(roles);
  });

  it('defaults roles to [] when the claim is absent', () => {
    // Hand-craft a token with no roles claim, signed with the real secret.
    const token = jwt.sign({ sub: 'user_2' }, process.env.JWT_ACCESS_SECRET!);
    expect(verifyAccessToken(token).roles).toEqual([]);
  });

  it('rejects a token signed with the wrong secret', () => {
    const forged = jwt.sign({ sub: 'user_3', roles }, 'not-the-real-secret');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('rejects a tampered/garbage token', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow();
  });

  it('rejects a token with no subject', () => {
    const token = jwt.sign({ roles }, process.env.JWT_ACCESS_SECRET!);
    expect(() => verifyAccessToken(token)).toThrow(/Malformed/);
  });
});

describe('refresh tokens', () => {
  it('generates a unique high-entropy token each call', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    // 48 random bytes → base64url is longer than the raw byte count.
    expect(a.length).toBeGreaterThanOrEqual(48);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // base64url alphabet, no padding
  });

  it('hashes deterministically and never stores the raw token', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token)); // stable for lookup
    expect(hashRefreshToken(token)).not.toBe(token); // hash != raw
    expect(hashRefreshToken(token)).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it('produces different hashes for different tokens', () => {
    expect(hashRefreshToken(generateRefreshToken())).not.toBe(
      hashRefreshToken(generateRefreshToken()),
    );
  });

  it('sets the refresh expiry in the future', () => {
    expect(refreshExpiryDate().getTime()).toBeGreaterThan(Date.now());
  });
});
