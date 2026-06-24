import { describe, it, expect, vi, beforeEach } from 'vitest';

// initSocket must attach a Redis adapter built from TWO DISTINCT createRedisConnection()
// clients — past one API instance, io.to(room).emit/fetchSockets() only see the local
// instance without it (cross-instance messages never deliver; online recipients on other
// instances look offline). Pub and sub can't share a connection (subscriber mode).

const { ServerMock, adapterFn, createAdapterMock, createRedisConnectionMock } = vi.hoisted(() => {
  const adapterFn = vi.fn();
  const ServerMock = vi.fn(function Server() {
    return { adapter: adapterFn, use: vi.fn(), on: vi.fn() };
  });
  const createAdapterMock = vi.fn((pub: unknown, sub: unknown) => ({ pub, sub }));
  let call = 0;
  const createRedisConnectionMock = vi.fn(() => ({ id: `redis-client-${++call}` }));
  return { ServerMock, adapterFn, createAdapterMock, createRedisConnectionMock };
});

vi.mock('socket.io', () => ({ Server: ServerMock }));
vi.mock('@socket.io/redis-adapter', () => ({ createAdapter: createAdapterMock }));
vi.mock('./redis', () => ({ createRedisConnection: createRedisConnectionMock }));
vi.mock('./prisma', () => ({ prisma: {} }));
vi.mock('./tokens', () => ({ verifyAccessToken: vi.fn() }));
vi.mock('./email', () => ({ emailUser: vi.fn() }));
vi.mock('../services/chat.service', () => ({ sendMessage: vi.fn() }));
vi.mock('../config/env', () => ({ config: { corsOrigins: ['http://localhost:3000'], WEB_BASE_URL: 'http://localhost:3000' } }));
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { initSocket } from './realtime';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('initSocket — Redis adapter for multi-instance realtime', () => {
  it('attaches an adapter built from two distinct createRedisConnection() clients', () => {
    initSocket({} as never);

    expect(createRedisConnectionMock).toHaveBeenCalledTimes(2);

    const [pubClient, subClient] = createAdapterMock.mock.calls[0]!;
    expect(pubClient).not.toBe(subClient); // distinct connections — sub can't share with pub

    expect(adapterFn).toHaveBeenCalledTimes(1);
    expect(adapterFn).toHaveBeenCalledWith(createAdapterMock.mock.results[0]!.value);
  });
});
