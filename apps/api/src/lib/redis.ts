import { Redis, type RedisOptions } from 'ioredis';
import { config } from '../config/env';

// BullMQ connection. `maxRetriesPerRequest: null` is required by BullMQ workers.
export function createRedisConnection(): Redis {
  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
  // Upstash requires TLS even when the URL uses the redis:// scheme.
  if (config.REDIS_URL.includes('upstash.io') && !config.REDIS_URL.startsWith('rediss://')) {
    options.tls = {};
  }
  return new Redis(config.REDIS_URL, options);
}
