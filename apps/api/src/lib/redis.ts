import { Redis } from 'ioredis';
import { env } from '../env';

const globalForRedis = globalThis as unknown as { redisClient: Redis | undefined };

const redisClient =
  globalForRedis.redisClient || (env.REDIS_URL ? 
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 0,
    retryStrategy: () => null, // Stop reconnecting immediately
  }) : undefined);

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redisClient;
}

let isRedisReady = false;
if (redisClient) {
  redisClient.on('ready', () => { isRedisReady = true; });
  redisClient.on('error', (err) => {
    isRedisReady = false;
  });
}

const memCache = new Map<string, string>();

export const redis = {
  get: async (key: string) => {
    if (isRedisReady && redisClient) return redisClient.get(key);
    return memCache.get(key) || null;
  },
  setex: async (key: string, seconds: number, value: string) => {
    if (isRedisReady && redisClient) return redisClient.setex(key, seconds, value);
    memCache.set(key, value);
    let ms = seconds * 1000;
    if (ms > 2147483647) ms = 2147483647; // Max 32-bit integer limit
    setTimeout(() => memCache.delete(key), ms);
    return 'OK';
  },
  del: async (key: string) => {
    if (isRedisReady && redisClient) return redisClient.del(key);
    memCache.delete(key);
    return 1;
  },
  ping: async () => {
    if (isRedisReady && redisClient) return redisClient.ping();
    return 'PONG';
  }
};
