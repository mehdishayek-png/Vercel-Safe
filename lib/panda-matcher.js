/**
 * PROJECT PANDA: Next-Generation Job Matching Engine
 * Inspired by Dota 2 balancing: Dynamic weighting, logarithmic decay, and exponential hard-counters.
 * This is an isolated experimental module.
 */

import { computeSemanticMatch } from './embeddings.js';

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
    'swiggy', 'zomato', 'flipkart', 'paytm', 'meesho', 'cred', 'razorpay', 'groww', 'zerodha', 'phonepe', 'stripe', 'uber', 'airbnb', 'spotify',
    // Construction / Real Estate / Infrastructure
    'larsen & toubro', 'l&t', 'tata projects', 'dlf', 'godrej properties', 'sobha', 'prestige', 'brigade', 'shapoorji pallonji', 'adani',
    'reliance', 'mahindra', 'oberoi realty', 'lodha', 'embassy', 'puravankara', 'salarpuria', 'aecom', 'jacobs', 'bechtel', 'fluor', 'turner',
];

const NON_LATIN_REGEX = /[\u0600-\u06FF\u0400-\u04FF]/;
const SENIOR_REGEX = /\b(senior|lead|principal|vp|director|head|architect)\b/;
const MANAGER_REGEX = /\b(manager|supervisor)\b/;
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
    // Construction / AEC depth signals
    'autocad', 'revit', 'bim', 'staad', 'etabs', 'primavera', 'navisworks',
    'quantity surveying', 'structural', 'estimation', 'boq', 'site management',
    'construction management', 'project planning', 'scheduling', 'ms project',
    'procore', 'sketchup', 'tekla', 'green building', 'leed',
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
    design: ['designer', 'ux ', 'ui ', 'product designer', 'graphic designer', 'visual designer', 'game designer', 'system designer', 'level designer', 'narrative designer'],
    gaming: ['game ', 'gaming', 'game designer', 'system designer', 'level designer', 'f2p', 'live ops', 'liveops', 'game economy', 'game ui', 'monetization designer', 'gameplay'],
    product: ['product manager', 'product owner', 'program manager', 'scrum master'],
    marketing: ['marketing', 'growth', 'seo', 'content', 'brand'],
    operations: ['operations manager', 'ops manager', 'supply chain', 'logistics', 'procurement'],
    construction: ['construction', 'site manager', 'site engineer', 'site supervisor', 'foreman', 'quantity surveyor', 'project engineer', 'structural engineer', 'civil engineer', 'building', 'pre-construction', 'preconstruction', 'estimator', 'planning engineer', 'safety officer', 'contractor'],
    architecture: ['architect', 'architectural', 'interior designer', 'landscape architect', 'urban planner', 'urban designer', 'town planner', 'draughtsman', 'draftsman'],
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

// Semantic embedding service moved to ./embeddings.js (uses computeSemanticMatch)

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
    const isManagerJob = !isSeniorJob && MANAGER_REGEX.test(title);
    const isInternJob = INTERN_REGEX.test(title);
    const isMidJob = !isSeniorJob && !isManagerJob && !isInternJob;

    let seniorityMultiplier = 1.0;

    // Continuous seniority gradient based on year-gap distance
    // A 5yr candidate and a 3yr candidate now get meaningfully different scores for the same senior role.
    // Manager (~8yr expected) sits between mid and senior in the gradient.
    const jobExpectedYears = isInternJob ? 1 : isSeniorJob ? 10 : isManagerJob ? 8 : 3;
    const yearGap = candidateYears - jobExpectedYears; // positive = overqualified, negative = reaching up

    if (Math.abs(yearGap) <= 2) {
        // Sweet spot: close match, boost scales with closeness
        seniorityMultiplier = 1.25 - (Math.abs(yearGap) * 0.06); // 1.25 (exact) → 1.13 (2yr off)
    } else if (yearGap < -2) {
        // Reaching UP: mild penalty that scales (ambition is okay, not crushed)
        seniorityMultiplier = Math.max(0.05, 1.0 - (Math.abs(yearGap) - 2) * 0.15);
        // 3yr gap → 0.85, 5yr gap → 0.55, 7yr gap → 0.25
    } else {
        // Reaching DOWN (overqualified): harsh, scales with gap
        seniorityMultiplier = Math.max(0.01, 1.0 - (yearGap - 2) * 0.25);
        // 3yr over → 0.75, 4yr over → 0.50, 5yr over → 0.25, 6yr+ → 0.01
    }

    // 3. RECENCY DECAY
    let recencyMultiplier = 1.0;
    if (job.date_posted) {
        const posted = new Date(job.date_posted);
        if (!isNaN(posted)) {
            const daysOld = Math.ceil(Math.abs(new Date() - posted) / (1000 * 60 * 60 * 24));
            // Smooth exponential decay instead of discrete steps
            // Day 0-2: 1.15 (fresh buff), then continuous decay
            // Day 7 → ~0.91, Day 14 → ~0.68, Day 21 → ~0.51, Day 30 → ~0.35
            if (daysOld <= 2) recencyMultiplier = 1.15;
            else recencyMultiplier = Math.max(0.25, 1.15 * Math.exp(-0.04 * (daysOld - 2)));
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
        locationMultiplier = 0.01; // Hard kill — same country but user specified city, job is vague/different area
    } else if (userState && combined.includes(userState)) {
        locationMultiplier = 1.3;  // Same state — solid buff
    } else if (userState && !isRemote && jobCountryMatch === userCountryKey) {
        // Same country, user wants specific state, but job is in a different area
        locationMultiplier = 0.01;
    } else if (isRemote && !isAnywhere && jobCountryMatch === userCountryKey) {
        locationMultiplier = 1.1;  // Remote within same country — slight buff
    } else if (jobCountryMatch === userCountryKey) {
        locationMultiplier = 0.01;  // Hard kill — same country but wrong city/state
    } else if (isAnywhere) {
        // Truly global/anywhere jobs — moderate penalty
        locationMultiplier = 0.60;
    } else if (isRemote) {
        // Remote but no country match — likely wrong country
        locationMultiplier = 0.05;
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
    const isExploreMode = preferences?.exploreAdjacent === true;
    let roleFamilyMultiplier = 1.0;
    const candidateFamily = detectRoleFamily(targetTitle);
    const jobFamily = detectRoleFamily(title);

    if (candidateFamily && jobFamily) {
        if (candidateFamily === jobFamily) {
            roleFamilyMultiplier = 1.1; // Same family — slight buff
        } else {
            // In explore mode, soften the penalty to allow adjacent roles through
            roleFamilyMultiplier = isExploreMode ? 0.75 : 0.4;
        }
    } else if (candidateFamily && !jobFamily) {
        // Candidate has a known career track but the job is unclassifiable.
        roleFamilyMultiplier = isExploreMode ? 0.85 : 0.65;
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
        // Zero title word overlap — in explore mode, be gentler
        const overlapCap = isExploreMode ? 0.75 : 0.55;
        roleFamilyMultiplier = Math.min(roleFamilyMultiplier, overlapCap);
    }

    // 9. NEGATIVE KEYWORD KILL (Scam / Irrelevant / Unreachable Role Filter)
    let negativeMultiplier = 1.0;
    if (hasNegativeKeywords(`${title} ${summary}`)) {
        negativeMultiplier = 0.01;
    }

    // 9b. TITLE-DESCRIPTION COHERENCE CHECK
    // Catches misleading titles where the job description has nothing to do with
    // the candidate's domain. E.g. "Customer Experience Manager" title on a B2B
    // education loan sales role — the title keyword matches but the actual work doesn't.
    let coherenceMultiplier = 1.0;
    if (keywordScore > 0 && summary) {
        // Check if matched keywords appear in the title but NOT in the description body
        const titleOnlyMatches = skills.filter(s => {
            const norm = s.normalized;
            return norm.length > 2 && title.includes(norm) && !summary.includes(norm);
        });
        // If ALL keyword matches came from title only and none from the description,
        // the job description doesn't actually involve the candidate's domain
        const descMatches = skills.filter(s => s.normalized.length > 2 && summary.includes(s.normalized));
        if (titleOnlyMatches.length > 0 && descMatches.length === 0) {
            coherenceMultiplier = 0.4; // Heavy penalty — title is misleading
        }
    }

    // 10. SEMANTIC EMBEDDING SIMILARITY
    // DISABLED in live scan — was making 90+ individual OpenAI API calls per scan.
    // Embeddings will be used in the daily cron/alert pipeline instead,
    // where latency and per-call cost don't matter.
    let semanticMultiplier = 1.0;
    let embeddingSimilarity = null;

    // MINIMUM BASE SCORE for title-matching jobs
    // When keywordScore=0 (niche skills like "F2P", "Live Ops" don't appear verbatim in JDs),
    // the entire score collapses to 0. If the job title overlaps with the candidate's headline,
    // give a minimum floor so the LLM phase can still evaluate the match.
    if (keywordScore === 0 && titleOverlap.length > 0) {
        keywordScore = 15; // ~25% base score — enough to pass threshold for LLM evaluation
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
    finalScore *= coherenceMultiplier;
    finalScore *= semanticMultiplier;

    if (negativeMultiplier <= 0.01) {
        finalScore = Math.min(finalScore, 5);
    }
    if (!isExploreMode) {
        if (roleFamilyMultiplier <= 0.4) {
            finalScore = Math.min(finalScore, 50); // Cross-family mismatch hard cap
        } else if (roleFamilyMultiplier <= 0.65) {
            finalScore = Math.min(finalScore, 60); // Unclassified or zero-overlap title cap
        }
    } else {
        // Explore mode: softer caps to let adjacent roles through
        if (roleFamilyMultiplier <= 0.75) {
            finalScore = Math.min(finalScore, 75);
        }
    }
    if (seniorityMultiplier <= 0.1) {
        finalScore = Math.min(finalScore, 30);
    }

    return {
        score: Math.round(Math.min(finalScore, 100)),
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
            coherence: coherenceMultiplier.toFixed(2),
            semantic: semanticMultiplier.toFixed(2),
        },
        matches: matchDetails
    };
}
