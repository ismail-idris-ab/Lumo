import { argon2id, hash, verify } from 'argon2';

// Argon2id password hashing (CLAUDE.md security must-dos).
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, { type: argon2id });
}

export function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  return verify(passwordHash, plain);
}
