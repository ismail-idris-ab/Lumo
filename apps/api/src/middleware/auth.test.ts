import { describe, it, expect, vi, beforeEach } from 'vitest';

// touchLastActive throttles the per-request lastActiveAt write through a Redis NX lock
// (apps/api/src/middleware/auth.ts) — at most one Postgres write per user per 5-minute
// window, and Redis being down must degrade to "skip the write", never "write every time".

const { redis, getRedis, userUpdate } = vi.hoisted(() => {
  const redis = { set: vi.fn() };
  const userUpdate = vi.fn();
  return { redis, getRedis: vi.fn(() => redis), userUpdate };
});

vi.mock('../lib/redis', () => ({ getRedis }));
vi.mock('../lib/prisma', () => ({ prisma: { user: { update: userUpdate } } }));

import { touchLastActive } from './auth';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('touchLastActive', () => {
  it('writes lastActiveAt when the Redis NX lock is fresh (first hit this window)', async () => {
    redis.set.mockResolvedValue('OK');

    await touchLastActive('u1');

    expect(redis.set).toHaveBeenCalledWith('presence:u1', '1', 'EX', 300, 'NX');
    expect(userUpdate).toHaveBeenCalledTimes(1);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { lastActiveAt: expect.any(Date) },
    });
  });

  it('skips the write when the lock is already held (within the throttle window)', async () => {
    redis.set.mockResolvedValue(null);

    await touchLastActive('u1');

    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('fails open (skips the write) when Redis is unavailable', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));

    await expect(touchLastActive('u1')).resolves.toBeUndefined();
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
