/**
 * Preference Learner
 *
 * Analyzes a user's saved jobs, applied jobs, and search history
 * to build a preference profile that can drive recommendations.
 *
 * Learns: preferred companies, industries, skill clusters,
 * seniority level, location patterns, salary ranges, and
 * which job sources produce the best matches.
 */

import { stripHtml } from './strip-html.js';

/**
 * Extract learned preferences from user behavior
 * @param {Object} params
 * @param {Object} params.profile - User's parsed resume profile
 * @param {Array} params.savedJobs - Jobs the user saved
 * @param {Array} params.appliedJobs - Jobs the user applied to
 * @param {Object} params.preferences - User's explicit preferences (location, remote, etc.)
 * @returns {Object} Learned preference profile
 */
export function learnPreferences({ profile, savedJobs = [], appliedJobs = [], preferences = {} }) {
    const allEngaged = [...appliedJobs, ...savedJobs];

    if (allEngaged.length === 0) {
        // No engagement data — use profile as-is
        return {
            queries: buildQueriesFromProfile(profile),
            boostCompanies: [],
            boostSkills: profile.skills?.slice(0, 10) || [],
            preferredSources: [],
            senioritySignal: detectSeniority(profile),
            hasEnoughData: false,
        };
    }

    // ---- Analyze engaged jobs ----

    // 1. Extract recurring companies
    const companyCounts = {};
    allEngaged.forEach(j => {
        const company = stripHtml(j.company || '').toLowerCase().trim();
        if (company && company !== 'unknown') {
            companyCounts[company] = (companyCounts[company] || 0) + 1;
        }
    });
    const boostCompanies = Object.entries(companyCounts)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
        .slice(0, 5);

    // 2. Extract recurring title keywords (what kinds of roles they like)
    const titleWords = {};
    const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'in', 'at', 'to', 'of', 'with', '-', '–', '|', '/', '&']);
    allEngaged.forEach(j => {
        const title = stripHtml(j.title || '').toLowerCase();
        title.split(/[\s\-\/]+/).forEach(word => {
            word = word.replace(/[^a-z0-9]/g, '');
            if (word.length >= 3 && !STOP_WORDS.has(word)) {
                titleWords[word] = (titleWords[word] || 0) + 1;
            }
        });
    });
    const topTitleKeywords = Object.entries(titleWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word]) => word);

    // 3. Extract skill patterns from job descriptions
    const skillsFromJobs = extractSkillPatterns(allEngaged, profile.skills || []);

    // 4. Source preference (which boards produce jobs they like)
    const sourceCounts = {};
    allEngaged.forEach(j => {
        const src = (j.source || '').toLowerCase();
        if (src) sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });
    const preferredSources = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

    // 5. Average score of engaged jobs (quality threshold)
    const scores = allEngaged
        .map(j => j.analysis?.fit_score || j.match_score || 0)
        .filter(s => s > 0);
    const avgEngagedScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 50;

    // 6. Build search queries from learned patterns
    const queries = buildQueriesFromLearned({
        profile,
        topTitleKeywords,
        boostCompanies,
        skillsFromJobs,
    });

    // 7. Location patterns
    const locationCounts = {};
    allEngaged.forEach(j => {
        const loc = stripHtml(j.location || '').toLowerCase().trim();
        if (loc && loc !== 'remote') {
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        }
    });
    const preferredLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([loc]) => loc);

    return {
        queries,
        boostCompanies,
        boostSkills: [...new Set([...(profile.skills?.slice(0, 5) || []), ...skillsFromJobs])].slice(0, 15),
        preferredSources,
        preferredLocations,
        senioritySignal: detectSeniority(profile),
        qualityThreshold: Math.max(avgEngagedScore - 15, 30), // slightly below their avg
        topTitleKeywords,
        hasEnoughData: allEngaged.length >= 2,
        engagementCount: allEngaged.length,
    };
}

function buildQueriesFromProfile(profile) {
    const queries = [];
    const headline = (profile.headline || '').trim();
    const skills = profile.skills || [];

    if (headline) queries.push(headline);

    // Top 3 skills + headline compounds
    const topSkills = skills.slice(0, 3);
    topSkills.forEach(skill => {
        if (headline) queries.push(`${skill} ${headline}`);
        else queries.push(`${skill} jobs`);
    });

    return queries.slice(0, 5);
}

function buildQueriesFromLearned({ profile, topTitleKeywords, boostCompanies, skillsFromJobs }) {
    const queries = [];
    const headline = (profile.headline || '').trim();

    // 1. Profile headline (always)
    if (headline) queries.push(headline);

    // 2. Learned title patterns + headline
    const titleCombos = topTitleKeywords.slice(0, 3);
    titleCombos.forEach(kw => {
        if (headline && !headline.toLowerCase().includes(kw)) {
            queries.push(`${kw} ${headline}`);
        }
    });

    // 3. Skills from engaged jobs
    skillsFromJobs.slice(0, 2).forEach(skill => {
        queries.push(`${skill} jobs`);
    });

    // 4. Company-specific searches (for users who target specific companies)
    if (boostCompanies.length > 0) {
        queries.push(`${boostCompanies[0]} ${headline || 'jobs'}`);
    }

    // Deduplicate
    const seen = new Set();
    return queries.filter(q => {
        const k = q.toLowerCase().trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    }).slice(0, 6);
}

function extractSkillPatterns(jobs, profileSkills) {
    const profileSkillsLower = new Set(profileSkills.map(s => s.toLowerCase()));
    const skillCounts = {};

    jobs.forEach(job => {
        // Get skills from heuristic breakdown matches
        const matches = job.heuristic_breakdown?.matches || [];
        matches.forEach(m => {
            const skill = m.skill?.toLowerCase();
            if (skill && !profileSkillsLower.has(skill)) {
                skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            }
        });
    });

    return Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([skill]) => skill);
}

function detectSeniority(profile) {
    const years = profile.experience_years || 0;
    const headline = (profile.headline || '').toLowerCase();

    if (years >= 10 || /\b(director|vp|head|principal)\b/.test(headline)) return 'senior+';
    if (years >= 5 || /\b(senior|lead|staff)\b/.test(headline)) return 'senior';
    if (years >= 2 || /\b(mid|intermediate)\b/.test(headline)) return 'mid';
    return 'entry';
}

// stripHtml imported from lib/strip-html.js
