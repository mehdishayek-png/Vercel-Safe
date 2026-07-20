/**
 * Postgres connection layer for Midas Match.
 *
 * Uses a singleton pg.Pool (matches the singleton pattern in lib/redis.js).
 * In production the app connects over Railway's private network via the
 * DATABASE_URL reference variable (${{Postgres.DATABASE_URL}}). For local
 * migration runs, pass the public proxy URL via DATABASE_URL on the CLI.
 *
 * Vectors are stored in the pgvector `vector(1536)` type (text-embedding-3-small).
 * We serialize/parse vectors manually instead of pulling in the `pgvector` npm
 * package — the wire format is a simple JSON-style array, so the surface is tiny
 * and we keep the dependency footprint minimal.
 */

import pg from 'pg';
import { warn, error } from './logger.js';

let _pool = null;

const WAKE_RETRY_DELAYS_MS = [300, 600, 1200, 2000];

export function isRetryableDbWakeError(err) {
    const code = String(err?.code || '');
    const message = String(err?.message || '');
    return ['57P03', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(code)
        || /database system is starting up|cannot connect now|connection refused/i.test(message);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the shared connection pool, or null if DATABASE_URL is unset.
 * Callers must treat a null pool as "DB unavailable" and degrade gracefully —
 * the app must keep working (heuristic-only) if Postgres is down.
 */
export function getPool() {
    if (_pool) return _pool;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        warn('[db] DATABASE_URL not set — Postgres features disabled');
        return null;
    }

    // Railway's internal network uses plain TCP; the public proxy needs TLS but
    // presents a cert that does not match the proxy hostname, so disable strict
    // verification for the public URL only. Internal connections ignore ssl.
    const isPublicProxy = /proxy\.rlwy\.net|\.railway\.app/.test(connectionString);

    _pool = new pg.Pool({
        connectionString,
        ssl: isPublicProxy ? { rejectUnauthorized: false } : undefined,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        query_timeout: 15_000,
        statement_timeout: 15_000,
    });

    _pool.on('error', (err) => {
        error('[db] idle client error:', err.message);
    });

    return _pool;
}

/**
 * Run a parameterized query. Returns rows, or [] on failure (logged, never throws)
 * unless `throwOnError` is set — callers in hot paths want graceful degradation.
 */
export async function query(text, params = [], { throwOnError = false } = {}) {
    const pool = getPool();
    if (!pool) {
        if (throwOnError) throw new Error('DATABASE_URL not configured');
        return [];
    }
    for (let attempt = 0; attempt <= WAKE_RETRY_DELAYS_MS.length; attempt++) {
        try {
            const res = await pool.query(text, params);
            return res.rows;
        } catch (err) {
            const shouldRetry = attempt < WAKE_RETRY_DELAYS_MS.length && isRetryableDbWakeError(err);
            if (shouldRetry) {
                const delayMs = WAKE_RETRY_DELAYS_MS[attempt];
                warn(`[db] database unavailable during wake; retrying in ${delayMs}ms`);
                await sleep(delayMs);
                continue;
            }

            error('[db] query failed:', err.message);
            if (throwOnError) throw err;
            return [];
        }
    }

    return [];
}

/** True if a usable pool exists (DATABASE_URL configured). */
export function isDbEnabled() {
    return !!process.env.DATABASE_URL;
}

// ─── pgvector serialization helpers ─────────────────────────────────────────

/**
 * Serialize a JS number[] into the pgvector input literal: "[0.1,0.2,...]".
 * Bind alongside a `$n::vector` placeholder in SQL.
 */
export function toVectorLiteral(vec) {
    if (!Array.isArray(vec) || vec.length === 0) return null;
    return `[${vec.join(',')}]`;
}

/**
 * Parse a pgvector text result ("[0.1,0.2]") back into a number[].
 * pgvector's output format is valid JSON, so JSON.parse is safe.
 */
export function parseVector(val) {
    if (!val) return null;
    if (Array.isArray(val)) return val;
    try {
        return JSON.parse(val);
    } catch {
        return null;
    }
}
