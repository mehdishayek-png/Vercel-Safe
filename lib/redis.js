// Singleton Redis client — every consumer imports from here.
// Returns null when env vars are missing (dev without Redis).
import { Redis } from '@upstash/redis';

let _instance = null;

function getRedisClient() {
    if (_instance) return _instance;
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return null;
    }
    _instance = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return _instance;
}

const redis = getRedisClient();

export { redis, getRedisClient };
