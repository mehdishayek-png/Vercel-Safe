// lib/matcher-enhanced.js — Enhanced matching engine (ported from matching_engine_enhanced.py)
// Implements 5-component scoring: semantic, skills, title, experience, recency

import crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const MATCH_THRESHOLD = 50;
const MAX_MATCHES = 25;
const MAX_PER_COMPANY = 3;
const EMBEDDING_MODEL = 'text-embedding-3-small';

// Score weights (total = 100 points)
const WEIGHTS = {
    semantic: 0.3,     // 30 points max
    skills: 30,        // 30 points max (raw score capped)
    title: 0.2,        // 20 points max
    experience: 10,    // 10 points base (minus penalties)
    recency: 10        // 10 points max
};

const SKILL_POINTS = {
    exactMatch: 10,
    partialMatch: 5
};

const RECENCY_BOOST = {
    today: 15,
    threeDays: 10,
    week: 5,
    older: 0
};

const EXPERIENCE_PENALTY = {
    juniorToSenior: 30,
    seniorToJunior: 15
};

// Negative keywords (auto-disqualify)
const NEGATIVE_KEYWORDS = [
    // Too senior
    'ceo', 'cto', 'coo', 'cfo', 'founder', 'co-founder', 'vp of', 'vice president',

    // Unrelated domains
    'medical doctor', 'physician', 'surgeon', 'nurse practitioner',
    'truck driver', 'delivery driver',
    'hair stylist', 'barber',

    // Sketchy/low-quality
    'crypto', 'nft', 'web3', 'blockchain engineer',
    'make money fast', 'work from home easy',
    'mlm', 'multi-level'
];

// Seniority markers
const SENIOR_MARKERS = [
    'lead', 'head of', 'head,', 'director', 'vp ', 'vice president',
    'principal', 'chief', 'cto', 'coo', 'ceo', 'cfo',
    'founding', 'co-founder', 'partner', 'svp', 'evp',
    'staff engineer', 'staff developer', 'distinguished',
    'senior', 'sr ', 'sr.' // Moved from MID to enforce strict experience check
];

const MID_MARKERS = ['manager', 'team lead', 'associate', 'mid-level'];

// ============================================
// EMBEDDING SERVICE
// ============================================

const embeddingCache = new Map();

function getTextHash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

async function getEmbedding(text, apiKey) {
    if (!text || text.trim().length < 3) return null;

    const hash = getTextHash(text);
    if (embeddingCache.has(hash)) {
        return embeddingCache.get(hash);
    }

    try {
        const truncated = text.slice(0, 8000);

        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: truncated,
                model: EMBEDDING_MODEL
            })
        });

        if (!response.ok) {
            throw new Error(`Embedding API error: ${response.status}`);
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        embeddingCache.set(hash, embedding);
        return embedding;
    } catch (error) {
        console.error('Embedding error:', error.message);
        return null;
    }
}

function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
}

async function semanticScore(profileText, jobText, apiKey) {
    const profileEmb = await getEmbedding(profileText, apiKey);
    const jobEmb = await getEmbedding(jobText, apiKey);

    if (!profileEmb || !jobEmb) return 0;

    const similarity = cosineSimilarity(profileEmb, jobEmb);
    return Math.max(0, Math.min(100, similarity * 100));
}

// ============================================
// SKILL MATCHING
// ============================================

function weightedSkillMatch(jobText, skills) {
    const jobLower = jobText.toLowerCase();
    let score = 0;
    const matched = [];

    for (const skill of skills) {
        const skillLower = skill.toLowerCase().trim();

        // Exact match (e.g., "payment gateway integration")
        if (jobLower.includes(skillLower)) {
            score += SKILL_POINTS.exactMatch;
            matched.push(skill);
        }
        // Partial match (e.g., "payment" in job, skill is "payment gateway")
        else {
            const words = skillLower.split(/\s+/).filter(w => w.length > 3);
            if (words.some(word => jobLower.includes(word))) {
                score += SKILL_POINTS.partialMatch;
                matched.push(skill);
            }
        }
    }

    return { score, matched };
}

// ============================================
// TITLE SIMILARITY
// ============================================

function titleSimilarityScore(profileHeadline, jobTitle) {
    if (!profileHeadline || !jobTitle) return 0;

    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'in', 'at', 'to', 'of']);

    const headlineLower = profileHeadline.toLowerCase();
    const titleLower = jobTitle.toLowerCase();

    const headlineWords = new Set(
        headlineLower.split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w))
    );

    const titleWords = new Set(
        titleLower.split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w))
    );

    if (headlineWords.size === 0 || titleWords.size === 0) return 0;

    // Jaccard similarity
    const intersection = new Set([...headlineWords].filter(x => titleWords.has(x)));
    const union = new Set([...headlineWords, ...titleWords]);

    return (intersection.size / union.size) * 100;
}

// ============================================
// EXPERIENCE ALIGNMENT
// ============================================

function titleSeniority(title) {
    const t = title.toLowerCase();
    if (SENIOR_MARKERS.some(m => t.includes(m))) return 'senior';
    if (MID_MARKERS.some(m => t.includes(m))) return 'mid';
    return 'open';
}

function experienceMismatchPenalty(candidateYears, jobTitle) {
    const seniority = titleSeniority(jobTitle);

    // Junior/Mid candidate (<8 years) applying to senior role
    // PENALTY: Strict >8 years requirement for Senior/Lead/Principal
    if (candidateYears < 8 && seniority === 'senior') {
        return 100; // Nuclear penalty - disqualify
    }

    // Mid-level candidate (<7 years) applying to Director/VP
    if (candidateYears < 7 && ['director', 'vp ', 'head of'].some(t => jobTitle.toLowerCase().includes(t))) {
        return 40;
    }

    // Senior candidate (>8 years) applying to junior role
    if (candidateYears > 8 && seniority === 'open' && jobTitle.toLowerCase().includes('junior')) {
        return 15;
    }

    return 0;
}

// ============================================
// RECENCY BOOST
// ============================================

function recencyBoost(job) {
    const postedDate = job.posted_date || job.date_posted;
    if (!postedDate) return 0;

    try {
        const posted = new Date(postedDate);
        const now = new Date();
        const ageDays = Math.floor((now - posted) / (1000 * 60 * 60 * 24));

        if (ageDays < 1) return RECENCY_BOOST.today;
        if (ageDays < 3) return RECENCY_BOOST.threeDays;
        if (ageDays < 7) return RECENCY_BOOST.week;
        return RECENCY_BOOST.older;
    } catch (error) {
        return 0;
    }
}

// ============================================
// NEGATIVE FILTERING
// ============================================

function hasNegativeKeywords(job) {
    const text = `${job.title || ''} ${job.summary || ''}`.toLowerCase();

    for (const keyword of NEGATIVE_KEYWORDS) {
        if (text.includes(keyword)) {
            return true;
        }
    }

    return false;
}

// ============================================
// ENHANCED SCORING
// ============================================

async function enhancedJobScore(job, profile, candidateYears, apiKey) {
    // Build text representations
    const profileText = `${profile.headline || ''} ${(profile.skills || []).join(' ')}`;
    const jobText = `${job.title || ''} ${job.summary || ''}`;

    const scores = {};

    // 1. Semantic similarity (0-30 points)
    const semantic = await semanticScore(profileText, jobText, apiKey);
    scores.semantic = Math.round(semantic * WEIGHTS.semantic);

    // 2. Skill matching (0-30 points)
    const skillResult = weightedSkillMatch(jobText, profile.skills || []);
    scores.skills = Math.min(WEIGHTS.skills, skillResult.score);
    scores.matchedSkills = skillResult.matched;

    // 3. Title similarity (0-20 points)
    const titleSim = titleSimilarityScore(profile.headline || '', job.title || '');
    scores.title = Math.round(titleSim * WEIGHTS.title);

    // 4. Experience alignment (0-10 points, or penalty)
    const expPenalty = experienceMismatchPenalty(candidateYears, job.title || '');
    scores.experience = WEIGHTS.experience - expPenalty;

    // 5. Recency boost (0-10 points)
    scores.recency = Math.min(WEIGHTS.recency, recencyBoost(job));

    // Total
    const total = Object.entries(scores)
        .filter(([key]) => key !== 'matchedSkills')
        .reduce((sum, [, value]) => sum + (typeof value === 'number' ? value : 0), 0);

    return {
        totalScore: Math.max(0, Math.min(100, Math.round(total))),
        breakdown: scores
    };
}

// ============================================
// COMPANY DIVERSITY
// ============================================

function enforceCompanyDiversity(jobs) {
    const companyCounts = {};
    const diverse = [];

    for (const job of jobs) {
        const company = job.company || 'Unknown';
        const count = companyCounts[company] || 0;

        if (count < MAX_PER_COMPANY) {
            diverse.push(job);
            companyCounts[company] = count + 1;
        }
    }

    return diverse;
}

// ============================================
// EXPERIENCE ESTIMATION
// ============================================

export function estimateYears(profile) {
    const expStr = (profile.experience || '').trim();
    const map = {
        '0–1 years': 0, '0-1 years': 0,
        '1–3 years': 2, '1-3 years': 2,
        '3–6 years': 4, '3-6 years': 4,
        '6–10 years': 7, '6-10 years': 7,
        '10+ years': 12,
    };

    if (map[expStr] !== undefined) return map[expStr];

    const headline = (profile.headline || '').toLowerCase();
    const match = headline.match(/(\d+)\+?\s*(?:years?|yrs?)/);
    if (match) return parseInt(match[1]);

    if (/intern|trainee|fresher/.test(headline)) return 0;
    if (/junior|associate/.test(headline)) return 1;
    if (/senior|lead|manager/.test(headline)) return 5;
    if (/director|head of|vp/.test(headline)) return 10;

    return 3;
}

// ============================================
// MAIN MATCHING PIPELINE
// ============================================

export async function matchJobsEnhanced(jobs, profile, apiKeys = {}, onProgress) {
    const candidateYears = typeof profile.experience_years === 'number'
        ? profile.experience_years
        : estimateYears(profile);

    const apiKey = apiKeys.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY required for enhanced matching');
    }

    onProgress?.(`Starting enhanced matching for ${jobs.length} jobs...`);

    // Step 1: Filter negatives
    const filteredJobs = jobs.filter(job => !hasNegativeKeywords(job));
    onProgress?.(`After negative filter: ${filteredJobs.length} jobs`);

    // Step 2: Score locally
    const scoredJobs = [];
    let processed = 0;

    for (const job of filteredJobs) {
        const scoreResult = await enhancedJobScore(job, profile, candidateYears, apiKey);

        if (scoreResult.totalScore >= MATCH_THRESHOLD) {
            scoredJobs.push({
                ...job,
                match_score: scoreResult.totalScore,
                _breakdown: scoreResult.breakdown
            });
        }

        processed++;
        if (processed % 10 === 0) {
            onProgress?.(`Scored ${processed}/${filteredJobs.length} jobs...`);
        }
    }

    onProgress?.(`After scoring (threshold ${MATCH_THRESHOLD}): ${scoredJobs.length} candidates`);

    // Step 3: Sort by score
    scoredJobs.sort((a, b) => b.match_score - a.match_score);

    // Step 4: Company diversity
    const diverseJobs = enforceCompanyDiversity(scoredJobs);

    // Step 5: Final results
    const finalMatches = diverseJobs.slice(0, MAX_MATCHES);

    // Clean internal fields
    const cleanedMatches = finalMatches.map(job => {
        const { _breakdown, ...clean } = job;
        return clean;
    });

    onProgress?.(`✅ Final matches: ${cleanedMatches.length}`);

    return cleanedMatches;
}
