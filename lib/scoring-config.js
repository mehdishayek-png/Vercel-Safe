/**
 * SCORING CONFIG — All hardcoded scoring weights for Project Panda.
 * Extracted from panda-matcher.js so tuning is centralized.
 * Changing a value here changes scoring behavior everywhere.
 */

export const SCORING_CONFIG = {

    // ── Base Score Normalization ──────────────────────────────────
    // Raw keyword score is divided by this to produce a 0-100 base
    baseNormDivisor: 60,

    // Minimum keyword score floor when title overlaps but no skills matched
    titleOverlapFloor: 15,

    // ── Skill Scoring ────────────────────────────────────────────
    skill: {
        lengthCap: 12,          // cap skill.length to prevent long phrases hoarding points
        lengthMult: 1.5,        // points per character of skill name (up to cap)
        capsMult: 2,            // bonus points per uppercase letter in skill name
        base: 5,                // flat base value added to every matched skill
        techAcronymBuff: 15,    // bonus for short, non-ambiguous tech acronyms (3-5 chars)
    },

    // ── Seniority Multiplier ─────────────────────────────────────
    seniority: {
        expectedYears: {
            intern: 1,
            senior: 10,
            manager: 8,
            mid: 3,
        },
        sweetSpotRange: 2,              // years within expected = sweet spot
        sweetSpotBase: 1.25,            // multiplier at exact match
        sweetSpotDecayPerYear: 0.06,    // reduction per year within sweet spot
        reachingUpDecayRate: 0.15,      // penalty per year beyond sweet spot (under-qualified)
        reachingUpFloor: 0.05,          // minimum multiplier when reaching up
        reachingDownDecayRate: 0.25,    // penalty per year beyond sweet spot (overqualified)
        reachingDownFloor: 0.01,        // minimum multiplier when reaching down
    },

    // ── Recency Multiplier ───────────────────────────────────────
    recency: {
        freshDays: 2,           // days considered "fresh"
        freshBuff: 1.15,        // multiplier for fresh posts
        decayRate: 0.04,        // exponential decay rate after fresh period
        floor: 0.25,            // minimum recency multiplier
    },

    // ── Prestige Multiplier ──────────────────────────────────────
    prestige: {
        base: 1.1,              // base multiplier for prestigious companies
        perYearBoost: 0.02,     // additional boost per candidate experience year
    },

    // ── Language Multiplier ──────────────────────────────────────
    language: {
        nonLatinPenalty: 0.2,   // multiplier when non-Latin script detected (scraping noise)
    },

    // ── Location Multiplier ──────────────────────────────────────
    location: {
        exactCity: 1.5,             // exact city match
        sameState: 1.3,             // same state match
        remoteSameCountry: 1.1,     // remote job within user's country
        wrongCountry: 0.01,         // explicit wrong country
        wrongCity: 0.02,            // explicitly wrong city
        vagueCountryMatch: 0.01,    // same country but vague/different area when user specified city
        sameCountryWrongState: 0.01,// same country, user wants specific state, job elsewhere
        sameCountryNoMatch: 0.01,   // same country but wrong city/state (non-remote)
        anywhere: 0.60,             // truly global/anywhere jobs
        remoteWrongCountry: 0.05,   // remote but likely wrong country
        unknownLocation: 0.05,      // undetectable location
    },

    // ── Depth Multiplier ─────────────────────────────────────────
    depth: {
        depthThreshold: 2,      // minimum depth indicators to consider candidate "has depth"
        shallowPenalty: 0.6,    // multiplier for basic/shallow support roles
        deepBuff: 1.15,         // multiplier when job aligns with candidate's depth
        neutral: 0.95,          // no depth signals either way
    },

    // ── Role Family Multiplier ───────────────────────────────────
    roleFamily: {
        sameFamily: 1.1,                   // same career track
        crossFamily: 0.4,                  // different career track (standard)
        crossFamilyExplore: 0.75,          // different career track (explore mode)
        unclassifiable: 0.65,              // candidate known, job unclassifiable (standard)
        unclassifiableExplore: 0.85,       // candidate known, job unclassifiable (explore mode)
        zeroOverlapCap: 0.55,              // zero title-word overlap cap (standard)
        zeroOverlapCapExplore: 0.75,       // zero title-word overlap cap (explore mode)
    },

    // ── Negative / Coherence / Domain Multipliers ────────────────
    negative: {
        killMultiplier: 0.01,       // multiplier when negative keywords found
    },
    coherence: {
        misleadingPenalty: 0.4,     // multiplier when title matches but description doesn't
    },
    domain: {
        mismatchPenalty: 0.3,               // confirmed domain mismatch (both detected, zero overlap)
        mismatchPenaltyExplore: 0.6,        // domain mismatch in explore mode
        matchBuff3plus: 1.15,               // 3+ shared domain clusters
        matchBuff2: 1.1,                    // 2 shared domain clusters
        matchBuff1: 1.05,                   // 1 shared domain cluster
    },

    // ── Hard Caps ────────────────────────────────────────────────
    caps: {
        negativeCap: 5,                     // max score when negative keywords detected
        domainMismatchCap: 25,              // max score on domain mismatch (standard)
        domainMismatchCapExplore: 40,       // max score on domain mismatch (explore)
        crossFamilyCap: 50,                 // max score on cross-family mismatch
        unclassifiedCap: 60,               // max score on unclassified/zero-overlap title
        crossFamilyCapExplore: 75,          // max score on cross-family (explore mode)
        seniorityCap: 30,                   // max score when seniority multiplier <= 0.1
        seniorityCapThreshold: 0.1,         // seniority multiplier threshold for cap
        maxScore: 100,                      // absolute max score
    },
};
