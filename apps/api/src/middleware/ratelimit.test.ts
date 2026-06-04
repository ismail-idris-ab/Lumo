import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Fixed-window Redis limiter (TRD §20). Verifies the counting/expiry/block logic, the keying
// strategy (ip vs user), and the fail-open guarantee — a Redis outage must never block traffic.

const { redis, getRedis, warn } = vi.hoisted(() => {
  const redis = { incr: vi.fn(), expire: vi.fn().mockResolvedValue(1) };
  return { redis, getRedis: vi.fn(() => redis), warn: vi.fn() };
});

vi.mock('../lib/redis', () => ({ getRedis }));
vi.mock('../lib/logger', () => ({ logger: { warn, info: vi.fn(), error: vi.fn() } }));

import { rateLimit } from './ratelimit';

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

// Run the middleware once and resolve after its async chain settles.
async function invoke(
  opts: Parameters<typeof rateLimit>[0],
  reqOverrides: Partial<Request> = {},
) {
  const req = { ip: '1.2.3.4', ...reqOverrides } as Request;
  const res = { setHeader: vi.fn() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  rateLimit(opts)(req, res, next);
  await tick();
  return { res, next };
}

const opts = { name: 'login', windowSec: 60, max: 3 } as const;

beforeEach(() => {
  vi.clearAllMocks();
  redis.expire.mockResolvedValue(1);
});

describe('rateLimit', () => {
  it('sets the window TTL only on the first hit', async () => {
    redis.incr.mockResolvedValue(1);
    await invoke(opts);
    expect(redis.expire).toHaveBeenCalledWith('lumo:rl:login:1.2.3.4', 60);

    vi.clearAllMocks();
    redis.incr.mockResolvedValue(2);
    await invoke(opts);
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('allows a request under the limit and sets remaining-count headers', async () => {
    redis.incr.mockResolvedValue(2);
    const { res, next } = await invoke(opts);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 3);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
    expect(next).toHaveBeenCalledWith(); // no error
  });

  it('blocks with 429 once the count exceeds the max', async () => {
    redis.incr.mockResolvedValue(4);
    const { res, next } = await invoke(opts);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(err).toMatchObject({ statusCode: 429 });
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0); // clamped, not negative
  });

  it("keys by user id when by:'user' and a user is present", async () => {
    redis.incr.mockResolvedValue(1);
    await invoke({ ...opts, by: 'user' }, { user: { id: 'u1' } } as Partial<Request>);
    expect(redis.incr).toHaveBeenCalledWith('lumo:rl:login:u1');
  });

  it("falls back to ip when by:'user' but no user is authenticated", async () => {
    redis.incr.mockResolvedValue(1);
    await invoke({ ...opts, by: 'user' });
    expect(redis.incr).toHaveBeenCalledWith('lumo:rl:login:1.2.3.4');
  });

  it('fails open (calls next with no error) when Redis is unavailable', async () => {
    redis.incr.mockRejectedValue(new Error('redis down'));
    const { next } = await invoke(opts);
    expect(next).toHaveBeenCalledWith();
    expect(warn).toHaveBeenCalled();
  });
});
