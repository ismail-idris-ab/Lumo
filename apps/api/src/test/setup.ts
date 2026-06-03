// Hermetic test environment. These are set BEFORE config/env.ts loads; dotenv does not
// override already-present process.env vars, so these win over apps/api/.env. Unit tests
// here never touch the DB or Paystack network — the DB URL is a dummy and the secret is fixed.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/lumo_test';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_lumo_fixed_secret_for_hmac';
