/**
 * BAMBOO COMPATIBILITY STUB + PRODUCTION LOCATION & SENIORITY
 * Uses bamboo's keyword scoring but with Panda's production-ready
 * location multiplier and seniority exponential hard-counter.
 */

import { extractKeywords, estimateYears } from './matcher.js';

function normalize(text) {
    return (text || '').toLowerCase().trim();
}

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

const SENIOR_REGEX = /\b(senior|lead|principal|vp|director|head|architect)\b/;
const MANAGER_REGEX = /\b(manager|supervisor)\b/;
const INTERN_REGEX = /\b(intern|internship|fresher|trainee|junior|entry)\b/;

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

/**
 * Calculates a score using bamboo's keyword matching + production location & seniority.
 */
export async function calculatePandaScore(job, profile, preferences = {}, apiKeys = {}) {
    const candidateYears = estimateYears(profile);
    const { primary, secondary, titleWords } = extractKeywords(profile);

    const title = normalize(job.title);
    const summary = normalize(job.summary);
    const company = normalize(job.company);
    const location = normalize(job.location);
    const combined = `${title} ${summary} ${company} ${location}`;

    // ---- BAMBOO KEYWORD SCORING ----
    let keywordScore = 0;
    const matchedPrimary = [];

    for (const kw of primary) {
        if (combined.includes(kw)) {
            matchedPrimary.push(kw);
            if (kw.length > 10) keywordScore += 12;
            else if (kw.length > 6) keywordScore += 8;
            else keywordScore += 5;
        }
    }

    for (const kw of secondary) {
        if (combined.includes(kw)) {
            keywordScore += 2;
        }
    }

    let titleMatchCount = 0;
    for (const w of titleWords) {
        if (title.includes(w)) titleMatchCount++;
    }
    if (titleMatchCount >= 2) keywordScore += 8;
    else if (titleMatchCount === 1) keywordScore += 4;

    // ---- PRODUCTION SENIORITY EXPONENTIAL HARD-COUNTER ----
    const isSeniorJob = SENIOR_REGEX.test(title);
    const isManagerJob = !isSeniorJob && MANAGER_REGEX.test(title);
    const isInternJob = INTERN_REGEX.test(title);

    let seniorityMultiplier = 1.0;
    const jobExpectedYears = isInternJob ? 1 : isSeniorJob ? 10 : isManagerJob ? 8 : 3;
    const yearGap = candidateYears - jobExpectedYears;

    if (Math.abs(yearGap) <= 2) {
        seniorityMultiplier = 1.25 - (Math.abs(yearGap) * 0.06);
    } else if (yearGap < -2) {
        // Reaching UP: mild penalty that scales
        seniorityMultiplier = Math.max(0.05, 1.0 - (Math.abs(yearGap) - 2) * 0.15);
    } else {
        // Reaching DOWN (overqualified): harsh, scales with gap
        seniorityMultiplier = Math.max(0.01, 1.0 - (yearGap - 2) * 0.25);
    }

    // ---- RECENCY DECAY ----
    let recencyMultiplier = 1.0;
    if (job.date_posted) {
        const posted = new Date(job.date_posted);
        if (!isNaN(posted)) {
            const daysOld = Math.ceil(Math.abs(new Date() - posted) / (1000 * 60 * 60 * 24));
            if (daysOld <= 2) recencyMultiplier = 1.15;
            else recencyMultiplier = Math.max(0.25, 1.15 * Math.exp(-0.04 * (daysOld - 2)));
        }
    }

    // ---- PRODUCTION LOCATION BOUNDING BOX (HARD ENFORCEMENT) ----
    let locationMultiplier = 1.0;
    const userCity = normalize(preferences.city);
    const userState = normalize(preferences.state);
    const userCountry = normalize(preferences.country);
    const userLocation = normalize(preferences.location || '');

    const titleAndLocation = `${title} ${location}`;
    const isRemote = titleAndLocation.includes('remote') || titleAndLocation.includes('wfh') || titleAndLocation.includes('work from home');
    const isAnywhere = location.includes('anywhere') || location.includes('worldwide') || location.includes('global');

    // Detect which country the JOB is in
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
            if (location.includes(',')) {
                explicitlyWrongCity = true;
            } else {
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
        locationMultiplier = 1.5;
    } else if (jobCountryMatch && userCountryKey && jobCountryMatch !== userCountryKey) {
        locationMultiplier = 0.01; // Wrong country — near-instant kill
    } else if (explicitlyWrongCity) {
        locationMultiplier = 0.02;
    } else if (vagueCountryMatch) {
        locationMultiplier = 0.01;
    } else if (userState && combined.includes(userState)) {
        locationMultiplier = 1.3;
    } else if (userState && !isRemote && jobCountryMatch === userCountryKey) {
        locationMultiplier = 0.01;
    } else if (isRemote && !isAnywhere && jobCountryMatch === userCountryKey) {
        locationMultiplier = 1.1;
    } else if (jobCountryMatch === userCountryKey) {
        locationMultiplier = 0.01;
    } else if (isAnywhere) {
        locationMultiplier = 0.60;
    } else if (isRemote) {
        locationMultiplier = 0.05;
    } else {
        locationMultiplier = 0.05;
    }

    // ---- FINAL SCORE ----
    let finalScore = (keywordScore / 60) * 100;
    finalScore *= seniorityMultiplier;
    finalScore *= recencyMultiplier;
    finalScore *= locationMultiplier;

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
            prestige: '1.00',
            location: locationMultiplier.toFixed(2),
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
