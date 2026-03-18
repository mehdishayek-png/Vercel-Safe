/**
 * Semantic embedding layer for Midas Match
 * Uses OpenAI text-embedding-3-small for affordable, fast embeddings
 *
 * Inspired by Marco Ferri's split-embedding approach:
 * - Role embedding (what you do) = headline + skills + whatIDo
 * - Job embedding (what they want) = title + first 300 chars of description
 * - Cosine similarity between them = semantic match signal
 */

import { log, warn } from './logger.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';
const EMBEDDING_TIMEOUT = 10000; // 10s

// ─── Simple in-memory cache (per serverless invocation) ─────────────────────
const cache = new Map();

function cacheKey(text) {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const chr = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return `emb_${hash}`;
}

// ─── Core embedding function ────────────────────────────────────────────────

/**
 * Generate an embedding vector for a text string.
 * Returns null if API key is missing or call fails.
 *
 * @param {string} text - Text to embed
 * @returns {Promise<number[]|null>} - 1536-dimensional embedding vector
 */
export async function getEmbedding(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        warn('[embeddings] OPENAI_API_KEY not set — skipping embedding');
        return null;
    }

    if (!text || text.trim().length < 5) return null;

    // Check cache
    const key = cacheKey(text);
    if (cache.has(key)) return cache.get(key);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT);

    try {
        const res = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                input: text.slice(0, 2000), // Cap at ~500 tokens
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            warn(`[embeddings] OpenAI API error: ${res.status}`);
            return null;
        }

        const data = await res.json();
        const embedding = data.data?.[0]?.embedding;

        if (embedding) {
            cache.set(key, embedding);
        }

        return embedding || null;
    } catch (err) {
        if (err.name === 'AbortError') {
            warn('[embeddings] Embedding request timed out');
        } else {
            warn(`[embeddings] Failed: ${err.message}`);
        }
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Generate embeddings for multiple texts in a single API call (batch).
 * More efficient than individual calls.
 *
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<(number[]|null)[]>} - Array of embedding vectors
 */
export async function getBatchEmbeddings(texts) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !texts.length) return texts.map(() => null);

    // Filter and deduplicate
    const validTexts = texts.map(t => (t || '').trim().slice(0, 2000)).filter(t => t.length >= 5);
    if (validTexts.length === 0) return texts.map(() => null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT * 2); // Double timeout for batches

    try {
        const res = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                input: validTexts,
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            warn(`[embeddings] Batch API error: ${res.status}`);
            return texts.map(() => null);
        }

        const data = await res.json();
        const embeddings = data.data?.map(d => d.embedding) || [];

        // Map back to original indices
        let validIdx = 0;
        return texts.map(t => {
            const trimmed = (t || '').trim();
            if (trimmed.length < 5) return null;
            return embeddings[validIdx++] || null;
        });
    } catch (err) {
        warn(`[embeddings] Batch failed: ${err.message}`);
        return texts.map(() => null);
    } finally {
        clearTimeout(timer);
    }
}

// ─── Cosine similarity ──────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two embedding vectors.
 * Returns a value between -1 and 1 (typically 0 to 1 for text).
 *
 * @param {number[]} a - First embedding
 * @param {number[]} b - Second embedding
 * @returns {number} - Cosine similarity score
 */
export function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

// ─── High-level matching functions ──────────────────────────────────────────

/**
 * Build a "role text" from a user profile for embedding.
 * Uses Marco Ferri's split-signal approach:
 * - whatIDo (user's own description) is the strongest signal
 * - headline + skills are fallbacks
 *
 * @param {Object} profile - User profile
 * @returns {string} - Text to embed
 */
export function buildRoleText(profile) {
    const parts = [];

    // "What I Do" is the primary signal (user's own words)
    if (profile.whatIDo) {
        parts.push(profile.whatIDo);
    }

    // Headline/job title
    if (profile.headline) {
        parts.push(profile.headline);
    }

    // Top skills (limit to 10)
    if (profile.skills?.length) {
        parts.push(`Skills: ${profile.skills.slice(0, 10).join(', ')}`);
    }

    // Industry
    if (profile.industry) {
        parts.push(profile.industry);
    }

    return parts.join('. ');
}

/**
 * Build a "job text" from a job listing for embedding.
 *
 * @param {Object} job - Job listing
 * @returns {string} - Text to embed
 */
export function buildJobText(job) {
    const parts = [];

    if (job.title) parts.push(job.title);
    if (job.company) parts.push(`at ${job.company}`);

    // First 300 chars of description (captures role summary)
    const desc = (job.description || job.summary || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (desc) parts.push(desc.slice(0, 300));

    return parts.join('. ');
}

/**
 * Compute semantic similarity between a user profile and a job.
 * Returns 0-1 score, or null if embeddings unavailable.
 *
 * @param {Object} profile - User profile with whatIDo, headline, skills
 * @param {Object} job - Job listing with title, company, description
 * @returns {Promise<number|null>} - Semantic similarity score (0-1)
 */
export async function computeSemanticMatch(profile, job) {
    const roleText = buildRoleText(profile);
    const jobText = buildJobText(job);

    if (!roleText || !jobText) return null;

    const [roleEmb, jobEmb] = await Promise.all([
        getEmbedding(roleText),
        getEmbedding(jobText),
    ]);

    if (!roleEmb || !jobEmb) return null;

    return cosineSimilarity(roleEmb, jobEmb);
}
