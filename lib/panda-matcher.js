/**
 * BAMBOO COMPATIBILITY STUB
 * Replaces Project Panda with a thin wrapper around the bamboo matcher's
 * local scoring logic, so that routes importing calculatePandaScore still work.
 */

import { extractKeywords, estimateYears } from './matcher.js';

/**
 * Calculates a score for a single job using bamboo's keyword matching.
 * Returns the same shape as the original Panda scorer so callers don't break.
 */
export async function calculatePandaScore(job, profile, preferences = {}, apiKeys = {}) {
    const candidateYears = estimateYears(profile);
    const { primary, secondary, titleWords } = extractKeywords(profile);

    const title = (job.title || '').toLowerCase();
    const summary = (job.summary || '').toLowerCase();
    const combined = `${title} ${summary}`;

    let score = 0;
    const matchedPrimary = [];

    // Primary keywords -- weight by length (same as bamboo scoreLocally)
    for (const kw of primary) {
        if (combined.includes(kw)) {
            matchedPrimary.push(kw);
            if (kw.length > 10) score += 12;
            else if (kw.length > 6) score += 8;
            else score += 5;
        }
    }

    // Secondary keywords
    for (const kw of secondary) {
        if (combined.includes(kw)) {
            score += 2;
        }
    }

    // Title word bonus
    let titleMatchCount = 0;
    for (const w of titleWords) {
        if (title.includes(w)) titleMatchCount++;
    }
    if (titleMatchCount >= 2) score += 8;
    else if (titleMatchCount === 1) score += 4;

    // Normalize to 0-100
    const normalizedScore = Math.round(Math.min((score / 60) * 100, 100));

    return {
        score: normalizedScore,
        raw: score,
        locationMultiplier: 1.0,
        multipliers: {
            seniority: '1.00',
            recency: '1.00',
            prestige: '1.00',
            location: '1.00',
            quality: '1.00',
            depth: '1.00',
            roleFamily: '1.00',
            negative: '1.00',
            coherence: '1.00',
            semantic: '1.00',
        },
        matches: matchedPrimary.slice(0, 10).map(kw => ({ skill: kw, value: kw.length > 10 ? 12 : kw.length > 6 ? 8 : 5 })),
    };
}
