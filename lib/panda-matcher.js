/**
 * PROJECT PANDA: Next-Generation Job Matching Engine
 * Inspired by Dota 2 balancing: Dynamic weighting, logarithmic decay, and exponential hard-counters.
 * This is an isolated experimental module.
 */

const PRESTIGIOUS_COMPANIES = [
    'google', 'apple', 'meta', 'amazon', 'netflix', 'microsoft', 'salesforce', 'adobe', 'intel', 'ibm', 'oracle', 'cisco', 'nvidia', 'tesla',
    'tcs', 'tata consultancy', 'infosys', 'wipro', 'hcl', 'tech mahindra', 'accenture', 'deloitte', 'pwc', 'ey', 'kpmg', 'capgemini', 'cognizant',
    'swiggy', 'zomato', 'flipkart', 'paytm', 'meesho', 'cred', 'razorpay', 'groww', 'zerodha', 'phonepe', 'stripe', 'uber', 'airbnb', 'spotify'
];

const NON_LATIN_REGEX = /[\u0600-\u06FF\u0400-\u04FF]/;
const SENIOR_REGEX = /\b(senior|lead|principal|vp|director|head|manager|architect)\b/;
const INTERN_REGEX = /\b(intern|internship|fresher|trainee|junior|entry)\b/;

/**
 * Normalizes text for matching
 */
function normalize(text) {
    return (text || '').toLowerCase().trim();
}

/**
 * Calculates a "Panda Score" for a single job match.
 */
export async function calculatePandaScore(job, profile, preferences = {}) {
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
            // Specific keywords like "Next.js" > "Java"
            const baseValue = (skill.length * 1.5) + (skill.caps * 2) + 5;

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

    // 6. LOCATION BOUNDING BOX
    let locationMultiplier = 1.0;
    const userCity = normalize(preferences.city);
    const userState = normalize(preferences.state);
    const userCountry = normalize(preferences.country);
    const isRemote = combined.includes('remote') || combined.includes('wfh');

    if (userCity && combined.includes(userCity)) {
        locationMultiplier = 1.7; // Local hero buff
    } else if (userState && combined.includes(userState)) {
        locationMultiplier = 1.2;
    } else if (userCountry && combined.includes(userCountry)) {
        locationMultiplier = 0.9; // Needs relocation/commute
    } else if (isRemote) {
        locationMultiplier = 1.1; // Remote is always good
    } else {
        locationMultiplier = 0.3; // Wrong geography
    }

    // FINAL SCORE CONSOLIDATION
    // Base Keyword Score is normalized against a "Standard Good Match" of 60 points
    let finalScore = (keywordScore / 60) * 100;

    // Apply compounding multipliers
    finalScore *= seniorityMultiplier;
    finalScore *= recencyMultiplier;
    finalScore *= prestigeMultiplier;
    finalScore *= languageMultiplier;
    finalScore *= locationMultiplier;

    return {
        score: Math.min(Math.round(finalScore), 100),
        raw: Math.round(keywordScore),
        locationMultiplier: parseFloat(locationMultiplier.toFixed(2)),
        multipliers: {
            seniority: seniorityMultiplier.toFixed(2),
            recency: recencyMultiplier.toFixed(2),
            prestige: prestigeMultiplier.toFixed(2),
            location: locationMultiplier.toFixed(2),
            quality: languageMultiplier.toFixed(2)
        },
        matches: matchDetails
    };
}
