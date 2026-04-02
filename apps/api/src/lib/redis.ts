import { Redis } from 'ioredis';
import { env } from '../env';

const globalForRedis = globalThis as unknown as { redisClient: Redis | undefined };

const redisClient =
  globalForRedis.redisClient ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 0,
    retryStrategy: () => null, // Stop reconnecting immediately
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redisClient;
}

let isRedisReady = false;
redisClient.on('ready', () => { isRedisReady = true; });
redisClient.on('error', (err) => {
  isRedisReady = false;
});

const memCache = new Map<string, string>();

export const redis = {
  get: async (key: string) => {
    if (isRedisReady) return redisClient.get(key);
    return memCache.get(key) || null;
  },
  setex: async (key: string, seconds: number, value: string) => {
    if (isRedisReady) return redisClient.setex(key, seconds, value);
    memCache.set(key, value);
    let ms = seconds * 1000;
    if (ms > 2147483647) ms = 2147483647; // Max 32-bit integer limit
    setTimeout(() => memCache.delete(key), ms);
    return 'OK';
  },
  del: async (key: string) => {
    if (isRedisReady) return redisClient.del(key);
    memCache.delete(key);
    return 1;
  }
};
