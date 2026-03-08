/**
 * PROJECT PANDA: Next-Generation Job Matching Engine
 * Inspired by Dota 2 balancing: Dynamic weighting, logarithmic decay, and exponential hard-counters.
 * This is an isolated experimental module.
 */

import crypto from 'crypto';

// NEGATIVE KEYWORDS — auto-disqualify scam, irrelevant, or unreachable roles
const NEGATIVE_KEYWORDS = [
    // Too senior / C-suite (unreachable for most candidates)
    'ceo', 'cto', 'coo', 'cfo', 'founder', 'co-founder', 'vp of', 'vice president',
    // Unrelated domains
    'medical doctor', 'physician', 'surgeon', 'nurse practitioner',
    'truck driver', 'delivery driver',
    'hair stylist', 'barber',
    // Sketchy / low-quality
    'crypto', 'nft', 'web3', 'blockchain engineer',
    'make money fast', 'work from home easy',
    'mlm', 'multi-level',
];

const PRESTIGIOUS_COMPANIES = [
    'google', 'apple', 'meta', 'amazon', 'netflix', 'microsoft', 'salesforce', 'adobe', 'intel', 'ibm', 'oracle', 'cisco', 'nvidia', 'tesla',
    'tcs', 'tata consultancy', 'infosys', 'wipro', 'hcl', 'tech mahindra', 'accenture', 'deloitte', 'pwc', 'ey', 'kpmg', 'capgemini', 'cognizant',
    'swiggy', 'zomato', 'flipkart', 'paytm', 'meesho', 'cred', 'razorpay', 'groww', 'zerodha', 'phonepe', 'stripe', 'uber', 'airbnb', 'spotify'
];

const NON_LATIN_REGEX = /[\u0600-\u06FF\u0400-\u04FF]/;
const SENIOR_REGEX = /\b(senior|lead|principal|vp|director|head|manager|architect)\b/;
const INTERN_REGEX = /\b(intern|internship|fresher|trainee|junior|entry)\b/;

// CITY ALIASES — canonical ↔ common/historical name pairs
const CITY_ALIASES = {
    'bengaluru': ['bangalore', 'bengaluru'],
    'bangalore': ['bangalore', 'bengaluru'],
    'mumbai': ['mumbai', 'bombay'],
    'bombay': ['mumbai', 'bombay'],
    'kolkata': ['kolkata', 'calcutta'],
    'calcutta': ['kolkata', 'calcutta'],
    'chennai': ['chennai', 'madras'],
    'madras': ['chennai', 'madras'],
    'gurgaon': ['gurgaon', 'gurugram'],
    'gurugram': ['gurgaon', 'gurugram'],
    'kochi': ['kochi', 'cochin'],
    'cochin': ['kochi', 'cochin'],
};

function cityMatchesInText(cityName, text) {
    if (!cityName) return false;
    const key = cityName.toLowerCase().trim();
    const aliases = CITY_ALIASES[key] || [key];
    return aliases.some(alias => text.includes(alias));
}

// ROLE DEPTH: Skills that indicate a strategic/technical role (not basic L1 support)
const DEPTH_INDICATORS = [
    'sso', 'saml', 'okta', 'workato', 'api', 'integration', 'implementation',
    'platform', 'enterprise', 'b2b', 'saas', 'automation', 'workflow',
    'onboarding', 'adoption', 'churn', 'retention', 'health score',
    'nps', 'csat', 'renewal', 'expansion', 'upsell', 'cross-sell',
    'zendesk', 'salesforce', 'hubspot', 'intercom', 'gainsight', 'totango',
    'jira', 'confluence', 'zapier', 'segment', 'mixpanel', 'amplitude',
    'aws', 'gcp', 'azure', 'terraform', 'docker', 'kubernetes',
    'sql', 'python', 'data pipeline', 'webhook', 'oauth', 'scim',
    'technical troubleshooting', 'solutions architect', 'pre-sales',
];

// Job indicators that signal a basic/shallow support role
const SHALLOW_JOB_INDICATORS = [
    'call center', 'phone support', 'answering calls', 'responding to emails',
    'help desk', 'helpdesk', 'l1 support', 'tier 1', 'tier-1', 't1 support',
    'customer service representative', 'customer care executive',
    'inbound calls', 'outbound calls', 'telecaller', 'bpo',
    'chat support', 'email support', 'ticket resolution',
    'data entry', 'back office', 'voice process', 'non-voice process',
];

// ROLE FAMILY MAP: Groups of job titles that belong to the same career track.
// Skills and title must COMPLEMENT each other — sharing "okta" doesn't make
// a Staff Engineer a match for a Customer Experience Specialist.
const ROLE_FAMILIES = {
    engineering: ['engineer', 'developer', 'programmer', 'architect', 'sde', 'swe', 'devops', 'sre', 'qa ', 'qe ', 'test engineer', 'software', 'fullstack', 'full stack', 'frontend', 'backend', 'iam engineer', 'technical support', 'it support'],
    cx_support: ['customer experience', 'customer success', 'customer support', 'cx ', 'csm', 'technical account manager', 'tam ', 'support specialist', 'customer care', 'client success', 'customer operations', 'product operations', 'product support'],
    sales: ['sales', 'account executive', 'business development', 'bdr', 'sdr', 'sales engineer', 'revenue', 'lead generation', 'inside sales', 'outside sales'],
    data: ['data scientist', 'data analyst', 'data engineer', 'machine learning', 'ml engineer', 'ai engineer', 'analytics'],
    design: ['designer', 'ux ', 'ui ', 'product designer', 'graphic designer', 'visual designer'],
    product: ['product manager', 'product owner', 'program manager', 'scrum master'],
    marketing: ['marketing', 'growth', 'seo', 'content', 'brand'],
    operations: ['operations manager', 'ops manager', 'supply chain', 'logistics', 'procurement'],
    it_infra: ['incident manager', 'incident management', 'itil', 'service level', 'change manager', 'problem manager', 'it infrastructure', 'network engineer', 'system administrator', 'sysadmin', 'infrastructure'],
    process: ['lean', 'six sigma', 'process excellence', 'process improvement', 'quality manager', 'quality assurance manager', 'continuous improvement'],
    finance: ['accountant', 'finance', 'auditor', 'controller', 'bookkeeper'],
    recruiting: ['recruiting', 'recruiter', 'talent acquisition', 'hiring', 'staffing'],
    hr: ['human resources', 'hr ', 'people operations', 'employee relations', 'compensation'],
};

/**
 * Detects which role family a title belongs to. Returns null if unclassifiable.
 */
function detectRoleFamily(titleText) {
    const t = (titleText || '').toLowerCase();
    for (const [family, keywords] of Object.entries(ROLE_FAMILIES)) {
        if (keywords.some(kw => t.includes(kw))) return family;
    }
    return null;
}

/**
 * Normalizes text for matching
 */
function normalize(text) {
    return (text || '').toLowerCase().trim();
}

/**
 * Checks if a job contains negative keywords that should auto-disqualify it.
 */
function hasNegativeKeywords(text) {
    const lower = text.toLowerCase();
    return NEGATIVE_KEYWORDS.some(kw => lower.includes(kw));
}

// ============================================
// SEMANTIC EMBEDDING SERVICE (ported from bamboo-enhanced)
// ============================================

const EMBEDDING_MODEL = 'text-embedding-3-small';
const embeddingCache = new Map();

function getTextHash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

async function getEmbedding(text, apiKey) {
    if (!text || text.trim().length < 3) return null;

    const hash = getTextHash(text);
    if (embeddingCache.has(hash)) return embeddingCache.get(hash);

    try {
        const truncated = text.slice(0, 8000);
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ input: truncated, model: EMBEDDING_MODEL })
        });

        if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);

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

    let dotProduct = 0, normA = 0, normB = 0;
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

async function semanticSimilarity(profileText, jobText, apiKey) {
    const profileEmb = await getEmbedding(profileText, apiKey);
    const jobEmb = await getEmbedding(jobText, apiKey);
    if (!profileEmb || !jobEmb) return null;
    return cosineSimilarity(profileEmb, jobEmb);
}

/**
 * Calculates a "Panda Score" for a single job match.
 */
export async function calculatePandaScore(job, profile, preferences = {}, apiKeys = {}) {
    const title = normalize(job.title);
    const summary = normalize(job.summary);
    const company = normalize(job.company);
    const location = normalize(job.location);
    const combined = `${title} ${summary} ${company} ${location}`;

    const targetTitle = normalize(profile.headline);
    const candidateYears = profile.experience_years || 0;

    // 1. DYNAMIC KEYWORD WEIGHTING (Information Density)
    let keywordScore = 0;

    // We map the skills to objects to preserve the original caps count BEFORE normalizing
    const skills = (profile.skills || []).map(s => ({
        raw: s,
        normalized: normalize(s),
        length: s.length,
        caps: (s.match(/[A-Z]/g)?.length || 0)
    }));

    let matchedCount = 0;
    const matchDetails = [];

    // Sort skills by length so longer (more specific) terms are processed first
    skills.sort((a, b) => b.length - a.length);

    for (const skill of skills) {
        if (combined.includes(skill.normalized)) {
            matchedCount++;

            // Panda Formula: Base value derived from complexity (length + caps)
            // Cap string length to prevent long generic phrases ("technical troubleshooting") from hoarding points.
            let baseValue = (Math.min(skill.length, 12) * 1.5) + (skill.caps * 2) + 5;

            // MASSIVE TECH BUFF: Short, spaceless acronyms (sso, saml, okta, aws, sql) get a huge bonus
            if (skill.length <= 5 && !skill.raw.includes(' ')) {
                baseValue += 15;
            }

            // TRUE DIMINISHING RETURNS (Logarithmic Decay)
            // Every subsequent skill match adds less value to prevent "Keyword Stuffing" spam.
            const multiplier = 1 / Math.log2(matchedCount + 1);
            const value = baseValue * multiplier;

            keywordScore += value;
            matchDetails.push({ skill: skill.raw, value: Math.round(value) });
        }
    }

    // 2. SENIORITY EXPONENTIAL HARD-COUNTER
    const isSeniorJob = SENIOR_REGEX.test(title);
    const isInternJob = INTERN_REGEX.test(title);
    const isMidJob = !isSeniorJob && !isInternJob;

    let seniorityMultiplier = 1.0;

    // Candidate Experience Profile
    if (candidateYears < 2) { // Junior/Entry candidate
        if (isInternJob) seniorityMultiplier = 1.2;
        if (isMidJob) seniorityMultiplier = 0.5;
        if (isSeniorJob) seniorityMultiplier = 0.05; // Hard counter: Impossible
    } else if (candidateYears >= 2 && candidateYears < 6) { // Mid candidate
        if (isMidJob) seniorityMultiplier = 1.25;
        if (isSeniorJob) seniorityMultiplier = 0.85; // Reaching up
        if (isInternJob) seniorityMultiplier = 0.05; // Hard counter: Insulting
    } else { // Senior candidate
        if (isSeniorJob) seniorityMultiplier = 1.3;
        if (isMidJob) seniorityMultiplier = 0.7; // Reaching down
        if (isInternJob) seniorityMultiplier = 0.01; // Blocked
    }

    // 3. RECENCY DECAY
    let recencyMultiplier = 1.0;
    if (job.date_posted) {
        const posted = new Date(job.date_posted);
        if (!isNaN(posted)) {
            const daysOld = Math.ceil(Math.abs(new Date() - posted) / (1000 * 60 * 60 * 24));
            // Curve: 1.1x for fresh (0-2d), 1.0x (3-7d), 0.8x (8-14d), 0.5x (15-21d), 0.1x (22d+)
            if (daysOld <= 2) recencyMultiplier = 1.15;
            else if (daysOld <= 7) recencyMultiplier = 1.0;
            else if (daysOld <= 14) recencyMultiplier = 0.75;
            else if (daysOld <= 21) recencyMultiplier = 0.45;
            else recencyMultiplier = 0.15;
        }
    }

    // 4. PRESTIGE SYNERGY (Multiplicative Buff)
    let prestigeMultiplier = 1.0;
    if (PRESTIGIOUS_COMPANIES.some(pc => company.includes(pc))) {
        // Prestige scales with seniority (Google values a Senior more than an Intern in a match)
        prestigeMultiplier = 1.1 + (candidateYears * 0.02);
    }

    // 5. LANGUAGE QUALITY PENALTY
    let languageMultiplier = 1.0;
    if (NON_LATIN_REGEX.test(combined)) {
        languageMultiplier = 0.2; // Severe penalty for scraping noise
    }

    // 6. LOCATION BOUNDING BOX (HARD ENFORCEMENT)
    // Wrong geography = near-instant kill. Users HATE seeing out-of-region results.
    let locationMultiplier = 1.0;
    const userCity = normalize(preferences.city);
    const userState = normalize(preferences.state);
    const userCountry = normalize(preferences.country);
    const userLocation = normalize(preferences.location || '');
    // Only check title + location for remote — NOT full description (false positives from "remote teams" etc.)
    const titleAndLocation = `${title} ${location}`;
    const isRemote = titleAndLocation.includes('remote') || titleAndLocation.includes('wfh') || titleAndLocation.includes('work from home');
    const isAnywhere = location.includes('anywhere') || location.includes('worldwide') || location.includes('global');

    // Known country aliases for explicit foreign-country detection
    const COUNTRY_SIGNALS = {
        'india': ['india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'gurgaon', 'noida', 'kolkata', 'kochi', 'ahmedabad', 'lucknow', 'jaipur'],
        'united states': ['united states', 'usa', 'u.s.', 'new york', 'san francisco', 'seattle', 'chicago', 'austin', 'boston', 'los angeles', 'denver'],
        'united kingdom': ['united kingdom', 'uk', 'london', 'manchester', 'birmingham', 'edinburgh'],
        'canada': ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa'],
        'germany': ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg', 'deutschland'],
        'australia': ['australia', 'sydney', 'melbourne', 'brisbane'],
        'singapore': ['singapore'],
        'uae': ['uae', 'dubai', 'abu dhabi', 'united arab emirates'],
    };

    // Detect which country the JOB is actually in (from its location text)
    let jobCountryMatch = null;
    for (const [country, signals] of Object.entries(COUNTRY_SIGNALS)) {
        if (signals.some(sig => location.includes(sig) || combined.includes(sig))) {
            jobCountryMatch = country;
            break;
        }
    }

    // Detect which country the USER wants
    let userCountryKey = null;
    for (const [country, signals] of Object.entries(COUNTRY_SIGNALS)) {
        if (signals.some(sig => userCountry.includes(sig) || userLocation.includes(sig))) {
            userCountryKey = country;
            break;
        }
    }

    // Determine explicitly wrong city
    let explicitlyWrongCity = false;
    let vagueCountryMatch = false;

    if (userCity && !isRemote) {
        if (!cityMatchesInText(userCity, combined)) {
            // It doesn't have the user's city
            if (location.includes(',')) {
                // Structured but missing city
                explicitlyWrongCity = true;
            } else {
                // Unstructured. Check if it hit another major city
                const majorCities = ['delhi', 'mumbai', 'hyderabad', 'pune', 'chennai', 'noida', 'gurgaon', 'kolkata', 'kochi', 'ahmedabad', 'new york', 'london', 'tumakuru', 'mysuru', 'erode', 'coimbatore', 'chandigarh', 'indore', 'palakkad', 'vadodara', 'bangalore', 'bengaluru'];
                if (majorCities.some(c => location.includes(c) || combined.includes(c))) {
                    explicitlyWrongCity = true;
                } else if (jobCountryMatch === userCountryKey) {
                    vagueCountryMatch = true;
                } else {
                    explicitlyWrongCity = true;
                }
            }
        }
    }

    if (userCity && cityMatchesInText(userCity, combined)) {
        locationMultiplier = 1.5;  // Exact city — solid buff (reduced from 3.0)
    } else if (jobCountryMatch && userCountryKey && jobCountryMatch !== userCountryKey) {
        // EXPLICIT WRONG COUNTRY — near-instant kill
        locationMultiplier = 0.01;
    } else if (explicitlyWrongCity) {
        locationMultiplier = 0.02; // Near-kill for explicitly wrong city
    } else if (vagueCountryMatch) {
        locationMultiplier = 0.10; // Massive penalty — vague country, user wanted a specific city
    } else if (userState && combined.includes(userState)) {
        locationMultiplier = 1.3;  // Same state — solid buff
    } else if (isRemote && !isAnywhere && jobCountryMatch === userCountryKey) {
        locationMultiplier = 1.1;  // Remote within same country — slight buff
    } else if (jobCountryMatch === userCountryKey) {
        locationMultiplier = 0.10;  // Same country, different city (fallback if explicitlyWrong didn't catch it)
    } else if (isRemote || isAnywhere) {
        // Remote/Anywhere but no country match — debuff (not a clear win for user)
        locationMultiplier = 0.50;
    } else {
        // Unknown/undetectable location — harsh penalty, assume wrong
        locationMultiplier = 0.05;
    }

    // 7. ROLE DEPTH MULTIPLIER (The "Unconventional CX" Shield)
    // If the candidate has advanced platform/integration skills, basic L1 support jobs get crushed.
    let depthMultiplier = 1.0;
    const candidateSkillsLower = (profile.skills || []).map(s => (s || '').toLowerCase());
    const candidateDepthCount = candidateSkillsLower.filter(s => DEPTH_INDICATORS.some(d => s.includes(d))).length;
    const hasDepth = candidateDepthCount >= 2; // Candidate has strategic/technical depth

    if (hasDepth) {
        const isShallowJob = SHALLOW_JOB_INDICATORS.some(si => combined.includes(si));
        // Also detect generic "customer service" roles that don't mention any platform/integration terms
        const jobHasDepth = DEPTH_INDICATORS.some(d => combined.includes(d));

        if (isShallowJob) {
            depthMultiplier = 0.6; // Moderate penalty — basic support role doesn't leverage this candidate's depth
        } else if (jobHasDepth) {
            depthMultiplier = 1.15; // Gentle buff — job aligns with candidate's platform/integration skills
        } else {
            depthMultiplier = 0.95; // Negligible — no depth signals either way
        }
    }

    // 8. ROLE FAMILY MISMATCH (Skills + Title must COMPLEMENT each other)
    // A CX Specialist and a Staff Engineer may share "okta" and "saml" skills,
    // but they are fundamentally different career tracks. Penalize cross-family matches.
    let roleFamilyMultiplier = 1.0;
    const candidateFamily = detectRoleFamily(targetTitle);
    const jobFamily = detectRoleFamily(title);

    if (candidateFamily && jobFamily) {
        if (candidateFamily === jobFamily) {
            roleFamilyMultiplier = 1.1; // Same family — slight buff
        } else {
            roleFamilyMultiplier = 0.4; // Different family — heavy penalty
        }
    } else if (candidateFamily && !jobFamily) {
        // Candidate has a known career track but the job is unclassifiable.
        // Apply a moderate penalty — unclassified jobs shouldn't ride free.
        roleFamilyMultiplier = 0.65;
    }

    // 8b. TITLE KEYWORD OVERLAP CHECK
    // If the candidate's headline and job title share zero meaningful words,
    // apply an additional penalty. This catches cases where generic keyword
    // matches inflate scores for completely unrelated roles.
    const TITLE_STOP_WORDS = new Set(['the', 'a', 'an', 'in', 'at', 'for', 'of', 'and', 'or', 'to', 'with', '-', '&', '|', 'i', 'ii', 'iii', 'sr', 'jr']);
    const candidateTitleWords = (targetTitle || '').toLowerCase().split(/[\s\-\/&,]+/).filter(w => w.length > 2 && !TITLE_STOP_WORDS.has(w));
    const jobTitleWords = title.split(/[\s\-\/&,]+/).filter(w => w.length > 2 && !TITLE_STOP_WORDS.has(w));
    const titleOverlap = candidateTitleWords.filter(w => jobTitleWords.some(jw => jw.includes(w) || w.includes(jw)));

    if (candidateTitleWords.length > 0 && jobTitleWords.length > 0 && titleOverlap.length === 0) {
        // Zero title word overlap — the job title is in a completely different domain
        roleFamilyMultiplier = Math.min(roleFamilyMultiplier, 0.55);
    }

    // 9. NEGATIVE KEYWORD KILL (Scam / Irrelevant / Unreachable Role Filter)
    let negativeMultiplier = 1.0;
    if (hasNegativeKeywords(`${title} ${summary}`)) {
        negativeMultiplier = 0.01;
    }

    // 10. SEMANTIC AFFINITY (Optional — requires OpenAI key)
    let semanticMultiplier = 1.0;
    const openaiKey = apiKeys?.OPENAI_API_KEY || apiKeys?.openai;
    if (openaiKey) {
        const profileText = `${targetTitle} ${(profile.skills || []).join(' ')}`;
        const jobText = `${title} ${summary}`;
        const similarity = await semanticSimilarity(profileText, jobText, openaiKey);
        if (similarity !== null) {
            // Range: 0.7x (low similarity) to 1.3x (high similarity)
            semanticMultiplier = 0.7 + (similarity * 0.6);
        }
    }

    // FINAL SCORE CONSOLIDATION
    // Base Keyword Score is normalized against a "Standard Good Match" of 60 points
    // (Lowered from 80: real-world JDs typically match 3-5 skills, ~40-55 raw)
    let finalScore = (keywordScore / 60) * 100;

    // Apply compounding multipliers
    finalScore *= seniorityMultiplier;
    finalScore *= recencyMultiplier;
    finalScore *= prestigeMultiplier;
    finalScore *= languageMultiplier;
    finalScore *= locationMultiplier;
    finalScore *= depthMultiplier;
    finalScore *= roleFamilyMultiplier;
    finalScore *= negativeMultiplier;
    finalScore *= semanticMultiplier;

    if (negativeMultiplier <= 0.01) {
        finalScore = Math.min(finalScore, 5);
    }
    if (roleFamilyMultiplier <= 0.4) {
        finalScore = Math.min(finalScore, 50); // Cross-family mismatch hard cap
    } else if (roleFamilyMultiplier <= 0.65) {
        finalScore = Math.min(finalScore, 60); // Unclassified or zero-overlap title cap
    }
    if (seniorityMultiplier <= 0.1) {
        finalScore = Math.min(finalScore, 30);
    }

    return {
        score: Math.min(Math.round(finalScore), 100),
        raw: Math.round(keywordScore),
        locationMultiplier: parseFloat(locationMultiplier.toFixed(2)),
        multipliers: {
            seniority: seniorityMultiplier.toFixed(2),
            recency: recencyMultiplier.toFixed(2),
            prestige: prestigeMultiplier.toFixed(2),
            location: locationMultiplier.toFixed(2),
            quality: languageMultiplier.toFixed(2),
            depth: depthMultiplier.toFixed(2),
            roleFamily: roleFamilyMultiplier.toFixed(2),
            negative: negativeMultiplier.toFixed(2),
            semantic: semanticMultiplier.toFixed(2),
        },
        matches: matchDetails
    };
}
