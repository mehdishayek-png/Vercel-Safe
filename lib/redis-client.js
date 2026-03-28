/**
 * Redis client adapter — works with both Upstash (serverless/Vercel) and local Redis (Docker/VPS).
 *
 * If REDIS_URL is set → uses `redis` npm package (local/self-hosted Redis)
 * If UPSTASH_REDIS_REST_URL is set → uses `@upstash/redis` (Upstash REST API)
 * If neither → returns null (app degrades gracefully)
 */

let redisInstance = null;
let isLocal = false;

async function getRedis() {
    if (redisInstance) return redisInstance;

    // Option 1: Local Redis (Docker, VPS, etc.)
    if (process.env.REDIS_URL) {
        const { createClient } = await import('redis');
        const client = createClient({ url: process.env.REDIS_URL });

        client.on('error', (err) => console.warn('[Redis] Local connection error:', err.message));

        await client.connect();
        isLocal = true;

        // Wrap the local client to match Upstash's API surface
        redisInstance = {
            _client: client,
            _isLocal: true,

            async get(key) {
                const val = await client.get(key);
                if (val === null) return null;
                try { return JSON.parse(val); } catch { return val; }
            },

            async set(key, value, options) {
                const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                if (options?.ex) {
                    await client.set(key, serialized, { EX: options.ex });
                } else {
                    await client.set(key, serialized);
                }
                return 'OK';
            },

            async del(key) {
                return client.del(key);
            },

            async incr(key) {
                return client.incr(key);
            },

            async incrby(key, amount) {
                return client.incrBy(key, amount);
            },

            async expire(key, seconds) {
                return client.expire(key, seconds);
            },

            async ttl(key) {
                return client.ttl(key);
            },

            async sadd(key, ...members) {
                return client.sAdd(key, members);
            },

            async smembers(key) {
                return client.sMembers(key);
            },

            async scard(key) {
                return client.sCard(key);
            },

            async eval(script, keys, args) {
                return client.eval(script, { keys, arguments: args.map(String) });
            },
        };

        console.log('[Redis] Connected to local Redis at', process.env.REDIS_URL);
        return redisInstance;
    }

    // Option 2: Upstash (serverless)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const { Redis } = await import('@upstash/redis');
        redisInstance = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        redisInstance._isLocal = false;
        console.log('[Redis] Connected to Upstash');
        return redisInstance;
    }

    // No Redis available
    console.warn('[Redis] No REDIS_URL or UPSTASH_REDIS_REST_URL configured — running without Redis');
    return null;
}

// Singleton getter — call this instead of importing Redis directly
export async function getRedisClient() {
    return getRedis();
}

// Synchronous check (only works after first getRedis() call)
export function isLocalRedis() {
    return isLocal;
}
