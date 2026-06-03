import { Redis, type RedisOptions } from 'ioredis';
import { config } from '../config/env';

// Upstash requires TLS even when the URL uses the redis:// scheme.
function tlsOption(): Pick<RedisOptions, 'tls'> {
  return config.REDIS_URL.includes('upstash.io') && !config.REDIS_URL.startsWith('rediss://')
    ? { tls: {} }
    : {};
}

// BullMQ connection. `maxRetriesPerRequest: null` is required by BullMQ workers.
export function createRedisConnection(): Redis {
  return new Redis(config.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false, ...tlsOption() });
}

// General-purpose client (rate limiting, caching). Lazy singleton.
let client: Redis | null = null;
export function getRedis(): Redis {
  client ??= new Redis(config.REDIS_URL, tlsOption());
  return client;
}
