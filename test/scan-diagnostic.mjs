/**
 * SCAN DIAGNOSTIC — Runs a full job scan locally and logs EVERY job with its score.
 * Groups results into: displayed (>=30), discarded (<30), and zero-score.
 * Shows exactly WHY each job was discarded (which multiplier killed it).
 *
 * Run: node test/scan-diagnostic.mjs
 * Requires .env.local with API keys (SERPER_API_KEY, OPENROUTER_API_KEY, etc.)
 */

// Load .env.local manually (no dotenv dependency)
import { readFileSync } from 'fs';
try {
    const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
    for (const line of envFile.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
    }
} catch { console.warn('No .env.local found'); }

import { calculatePandaScore } from '../lib/panda-matcher.js';
import { fetchAllJobsStreaming } from '../lib/job-fetcher.js';
import { logMatch } from '../lib/debug/match-logger.js';

const QUALITY_THRESHOLD = 30;

// ── Mehdi's profile ──────────────────────────────────────────
const profile = {
    headline: 'Customer Experience & Operations Leader',
    skills: ['CX', 'SSO', 'B2B', 'IAM', 'Okta', 'Workato', 'Zendesk', 'automation'],
    experience_years: 5,
    location: 'Bengaluru, India',
};
const preferences = {
    city: 'bengaluru',
    state: 'karnataka',
    country: 'in',
    location: 'Bengaluru, India',
    midasSearch: false,
};

// ── Tracking ─────────────────────────────────────────────────
const allJobs = [];
let totalRaw = 0;

function getKillerMultiplier(multipliers) {
    const killers = [];
    const m = multipliers;
    if (parseFloat(m.location) < 0.1) killers.push(`location=${m.location}`);
    if (parseFloat(m.roleFamily) < 0.5) killers.push(`roleFamily=${m.roleFamily}`);
    if (parseFloat(m.domain) < 0.5) killers.push(`domain=${m.domain} (${m.domainDetail})`);
    if (parseFloat(m.seniority) < 0.3) killers.push(`seniority=${m.seniority}`);
    if (parseFloat(m.coherence) < 0.5) killers.push(`coherence=${m.coherence}`);
    if (parseFloat(m.negative) < 0.5) killers.push(`negative=${m.negative}`);
    if (parseFloat(m.depth) < 0.8) killers.push(`depth=${m.depth}`);
    if (parseFloat(m.recency) < 0.5) killers.push(`recency=${m.recency}`);
    return killers.length > 0 ? killers.join(', ') : 'low keyword match (raw score)';
}

async function main() {
    console.log('=== SCAN DIAGNOSTIC ===\n');
    console.log(`Profile: ${profile.headline}`);
    console.log(`Skills: ${profile.skills.join(', ')}`);
    console.log(`Location: ${preferences.city}, ${preferences.country}`);
    console.log(`Threshold: score >= ${QUALITY_THRESHOLD}\n`);

    const sourceStats = {};
    const pendingScoring = [];

    const onSourceComplete = (sourceName, jobs) => {
        totalRaw += jobs.length;
        sourceStats[sourceName] = { total: jobs.length, displayed: 0, discarded: 0 };
        const promise = (async () => {

        for (const job of jobs) {
            try {
                const result = await calculatePandaScore(job, profile, preferences, {});
                await logMatch({
                    stage: 'list_score',
                    profile,
                    job,
                    pandaScore: result.score,
                    pandaBreakdown: result,
                    llmScore: null,
                    aiVerdict: null,
                    combinedScore: result.score,
                    notes: 'scan-diagnostic',
                });
                allJobs.push({
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    source: sourceName,
                    score: result.score,
                    raw: result.raw,
                    matchCount: result.matches.length,
                    matches: result.matches.map(m => m.skill).join(', '),
                    multipliers: result.multipliers,
                    killer: result.score < QUALITY_THRESHOLD ? getKillerMultiplier(result.multipliers) : null,
                });

                if (result.score >= QUALITY_THRESHOLD) {
                    sourceStats[sourceName].displayed++;
                } else {
                    sourceStats[sourceName].discarded++;
                }
            } catch (err) {
                allJobs.push({
                    title: job.title, company: job.company, source: sourceName,
                    score: -1, error: err.message,
                });
                sourceStats[sourceName].discarded++;
            }
        }
        })();
        pendingScoring.push(promise);
    };

    const onProgress = (msg) => {
        process.stdout.write(`\r  ${msg.padEnd(60)}`);
    };

    console.log('Fetching jobs...\n');

    try {
        await fetchAllJobsStreaming(profile, {}, onSourceComplete, onProgress, preferences);
    } catch (err) {
        console.error('\nFetch error:', err.message);
    }

    // Wait for all async scoring loops to complete (slow sources like Workday finish last)
    await Promise.all(pendingScoring);

    console.log('\n');

    // ── Sort by score descending ─────────────────────────────
    allJobs.sort((a, b) => b.score - a.score);

    const displayed = allJobs.filter(j => j.score >= QUALITY_THRESHOLD);
    const discarded = allJobs.filter(j => j.score >= 0 && j.score < QUALITY_THRESHOLD);
    const zero = allJobs.filter(j => j.score === 0);
    const errors = allJobs.filter(j => j.score === -1);

    // ── Summary ──────────────────────────────────────────────
    console.log('═══ SUMMARY ═══');
    console.log(`Total raw: ${totalRaw}`);
    console.log(`Total scored: ${allJobs.length}`);
    console.log(`Displayed (>=${QUALITY_THRESHOLD}): ${displayed.length}`);
    console.log(`Discarded (<${QUALITY_THRESHOLD}): ${discarded.length}`);
    console.log(`Zero score: ${zero.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log('');

    // ── Source breakdown ─────────────────────────────────────
    console.log('═══ SOURCE BREAKDOWN ═══');
    for (const [source, stats] of Object.entries(sourceStats).sort((a, b) => b[1].total - a[1].total)) {
        const pct = stats.total > 0 ? Math.round(stats.displayed / stats.total * 100) : 0;
        console.log(`  ${source.padEnd(25)} ${String(stats.total).padStart(5)} total | ${String(stats.displayed).padStart(4)} displayed | ${String(stats.discarded).padStart(4)} discarded | ${pct}% hit rate`);
    }
    console.log('');

    // ── Top 20 displayed ─────────────────────────────────────
    console.log('═══ TOP 20 DISPLAYED (>= 30) ═══');
    for (const j of displayed.slice(0, 20)) {
        console.log(`  [${j.score}] ${j.title} @ ${j.company} (${j.source})`);
        console.log(`       Skills: ${j.matches || 'none'} | Raw: ${j.raw} | Loc: ${j.multipliers?.location}`);
    }
    console.log('');

    // ── Discarded analysis ───────────────────────────────────
    console.log('═══ DISCARDED ANALYSIS (score 1-29) ═══');

    // Group by killer reason
    const killerGroups = {};
    for (const j of discarded.filter(j => j.score > 0)) {
        const reason = j.killer || 'unknown';
        if (!killerGroups[reason]) killerGroups[reason] = [];
        killerGroups[reason].push(j);
    }

    for (const [reason, jobs] of Object.entries(killerGroups).sort((a, b) => b[1].length - a[1].length)) {
        console.log(`\n  ── ${reason} (${jobs.length} jobs) ──`);
        for (const j of jobs.slice(0, 5)) {
            console.log(`    [${j.score}] ${j.title} @ ${j.company} (${j.source})`);
            console.log(`         Skills matched: ${j.matches || 'none'} | Raw: ${j.raw}`);
        }
        if (jobs.length > 5) console.log(`    ... and ${jobs.length - 5} more`);
    }
    console.log('');

    // ── Zero-score analysis ──────────────────────────────────
    console.log(`═══ ZERO SCORE (${zero.length} jobs) ═══`);

    // Group by source
    const zeroBySource = {};
    for (const j of zero) {
        if (!zeroBySource[j.source]) zeroBySource[j.source] = [];
        zeroBySource[j.source].push(j);
    }
    for (const [source, jobs] of Object.entries(zeroBySource).sort((a, b) => b[1].length - a[1].length)) {
        console.log(`  ${source}: ${jobs.length} zero-score jobs`);
        for (const j of jobs.slice(0, 3)) {
            console.log(`    [0] ${j.title} @ ${j.company}`);
            console.log(`         ${j.killer || 'no skills matched'}`);
        }
        if (jobs.length > 3) console.log(`    ... and ${jobs.length - 3} more`);
    }
    console.log('');

    // ── Potentially good jobs that got killed ────────────────
    console.log('═══ POTENTIALLY GOOD JOBS KILLED (score 15-29) ═══');
    const borderline = discarded.filter(j => j.score >= 15 && j.score < 30);
    for (const j of borderline.slice(0, 20)) {
        console.log(`  [${j.score}] ${j.title} @ ${j.company} (${j.source})`);
        console.log(`       Skills: ${j.matches || 'none'} | Killer: ${j.killer}`);
        console.log(`       Multipliers: loc=${j.multipliers?.location} role=${j.multipliers?.roleFamily} domain=${j.multipliers?.domain}(${j.multipliers?.domainDetail}) sen=${j.multipliers?.seniority}`);
    }

    console.log('\n=== DONE ===');
}

main().catch(console.error);
