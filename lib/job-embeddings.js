/**
 * Embedding cache + retrieval layer backed by Postgres/pgvector.
 *
 * Bridges the OpenAI embedding helpers (lib/embeddings.js) with the persistent
 * pgvector store so the semantic re-rank doesn't re-pay for embeddings it has
 * already computed. Two caches:
 *
 *   1. Job embeddings — content-addressed in job_embeddings(content_hash).
 *      The same posting seen across scans reuses one embedding.
 *   2. Role embedding — per-user in profiles.role_emb, keyed by role_emb_hash
 *      so it only recomputes when the user's profile text actually changes.
 *
 * Everything degrades gracefully: if Postgres or OpenAI is unavailable, callers
 * get null/empty and the scan falls back to heuristic-only ranking.
 */

import { createHash } from 'node:crypto';
import { query, toVectorLiteral, parseVector, isDbEnabled } from './db.js';
import { getBatchEmbeddings, getEmbedding, buildJobText, buildRoleText } from './embeddings.js';
import { warn } from './logger.js';

function sha256(text) {
    return createHash('sha256').update(text).digest('hex');
}

/**
 * Resolve embeddings for a set of candidate jobs, using the pgvector cache and
 * batch-embedding only the misses. Returns a Map keyed by each job's identity
 * (see jobKey) → number[] embedding.
 *
 * @param {Object[]} jobs
 * @returns {Promise<Map<string, number[]>>}
 */
export async function getJobEmbeddings(jobs) {
    const out = new Map();
    if (!jobs?.length) return out;

    // Build job text + content hash for each, skipping ones too thin to embed.
    const entries = jobs.map((job) => {
        const text = buildJobText(job);
        return text && text.length >= 5
            ? { job, text, hash: sha256(text), key: jobKey(job) }
            : null;
    }).filter(Boolean);
    if (!entries.length) return out;

    // 1. Look up cached embeddings by content hash.
    const hashes = [...new Set(entries.map((e) => e.hash))];
    const cached = new Map();
    if (isDbEnabled()) {
        const rows = await query(
            'SELECT content_hash, embedding::text AS embedding FROM job_embeddings WHERE content_hash = ANY($1)',
            [hashes]
        );
        for (const r of rows) {
            const vec = parseVector(r.embedding);
            if (vec) cached.set(r.content_hash, vec);
        }
    }

    // 2. Batch-embed the misses.
    const misses = entries.filter((e) => !cached.has(e.hash));
    // Dedupe miss texts by hash so identical postings embed once.
    const missByHash = new Map();
    for (const e of misses) if (!missByHash.has(e.hash)) missByHash.set(e.hash, e);
    const missList = [...missByHash.values()];

    if (missList.length) {
        const vecs = await getBatchEmbeddings(missList.map((e) => e.text));
        const toInsert = [];
        for (let i = 0; i < missList.length; i++) {
            const vec = vecs[i];
            if (!vec) continue;
            cached.set(missList[i].hash, vec);
            toInsert.push({
                hash: missList[i].hash,
                vec,
                title: (missList[i].job.title || '').slice(0, 300),
                company: (missList[i].job.company || '').slice(0, 200),
            });
        }
        if (toInsert.length && isDbEnabled()) {
            await persistJobEmbeddings(toInsert);
        }
    }

    // 3. Map each job's identity → embedding.
    for (const e of entries) {
        const vec = cached.get(e.hash);
        if (vec) out.set(e.key, vec);
    }
    return out;
}

/** Bulk upsert job embeddings; best-effort (logs and continues on failure). */
async function persistJobEmbeddings(rows) {
    // Build a single multi-row INSERT ... ON CONFLICT DO NOTHING.
    const values = [];
    const params = [];
    let p = 1;
    for (const r of rows) {
        values.push(`($${p++}, $${p++}::vector, $${p++}, $${p++})`);
        params.push(r.hash, toVectorLiteral(r.vec), r.title, r.company);
    }
    try {
        await query(
            `INSERT INTO job_embeddings (content_hash, embedding, job_title, job_company)
             VALUES ${values.join(', ')}
             ON CONFLICT (content_hash) DO NOTHING`,
            params,
            { throwOnError: true }
        );
    } catch (err) {
        warn('[job-embeddings] persist failed:', err.message);
    }
}

/**
 * Resolve the user's role embedding, cached per-profile in profiles.role_emb.
 * Recomputes only when the role text hash changes.
 *
 * @param {Object} profile
 * @param {string} [userId] - Clerk id; enables the persistent per-user cache.
 * @returns {Promise<number[]|null>}
 */
export async function getRoleEmbedding(profile, userId) {
    const text = buildRoleText(profile);
    if (!text || text.length < 5) return null;
    const hash = sha256(text);

    // Cache hit?
    if (userId && isDbEnabled()) {
        const rows = await query(
            'SELECT role_emb::text AS role_emb, role_emb_hash FROM profiles WHERE user_id = $1',
            [userId]
        );
        if (rows[0]?.role_emb_hash === hash) {
            const vec = parseVector(rows[0].role_emb);
            if (vec) return vec;
        }
    }

    // Compute fresh.
    const vec = await getEmbedding(text);
    if (!vec) return null;

    // Write-through (best-effort). Requires the user row to exist; upsert it.
    if (userId && isDbEnabled()) {
        try {
            await query(
                `INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
                [userId],
                { throwOnError: true }
            );
            await query(
                `INSERT INTO profiles (user_id, role_emb, role_emb_hash, updated_at)
                 VALUES ($1, $2::vector, $3, now())
                 ON CONFLICT (user_id) DO UPDATE
                   SET role_emb = EXCLUDED.role_emb,
                       role_emb_hash = EXCLUDED.role_emb_hash,
                       updated_at = now()`,
                [userId, toVectorLiteral(vec), hash],
                { throwOnError: true }
            );
        } catch (err) {
            warn('[job-embeddings] role cache write failed:', err.message);
        }
    }

    return vec;
}

/**
 * Stable identity for a job, used to key the returned embedding map back to the
 * caller's jobs. Mirrors the dedup key (company::title) used in job-fetcher.
 */
export function jobKey(job) {
    const company = (job.company || '').toLowerCase().trim();
    const title = (job.title || '').toLowerCase().trim();
    return `${company}::${title}`;
}
