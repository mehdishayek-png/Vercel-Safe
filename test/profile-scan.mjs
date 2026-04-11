/**
 * PROFILE SCAN — Run a real job fetch for a specific profile and show top results.
 * Usage: node test/profile-scan.mjs <profile_name>
 * Profiles: sanmitra | mehdi | jayanth | gilles | tanish
 */
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

const PROFILES = {
    sanmitra: {
        profile: {
            headline: 'Senior Software Developer',
            skills: ['Java', 'Python', 'JavaScript', 'SQL', 'Spring Boot', 'React', 'Node.js', 'AWS', 'Docker', 'Grafana', 'ETL', 'Apache Airflow'],
            experience_years: 6,
            location: 'Bengaluru, India',
        },
        preferences: { city: 'bengaluru', country: 'in', location: 'Bengaluru, India', midasSearch: false },
    },
    mehdi: {
        profile: {
            headline: 'AI Product Operations & Workflow Automation Specialist',
            skills: ['Workato', 'Zendesk', 'Okta', 'SSO', 'IAM', 'LLM', 'automation', 'incident management', 'Python'],
            experience_years: 5,
            location: 'Bengaluru, India',
        },
        preferences: { city: 'bengaluru', country: 'in', location: 'Bengaluru, India', midasSearch: false },
    },
    jayanth: {
        profile: {
            headline: 'Game Designer',
            skills: ['Unity', 'Unreal Engine', 'system design', 'economy design', 'game design', 'F2P', 'live ops', 'narrative design'],
            experience_years: 5,
            location: 'Bengaluru, India',
        },
        preferences: { city: 'bengaluru', country: 'in', location: 'Bengaluru, India', midasSearch: false },
    },
    gilles: {
        profile: {
            headline: 'Senior Project Coordinator',
            skills: ['workflow coordination', 'quality control', 'asset management', 'Microsoft Excel', 'Google Sheets', 'subtitle editing', 'vendor management'],
            experience_years: 8,
            location: 'Bengaluru, India',
        },
        preferences: { city: 'bengaluru', country: 'in', location: 'Bengaluru, India', midasSearch: false },
    },
    tanish: {
        profile: {
            headline: 'Production Manager',
            skills: ['video production', 'production management', 'scheduling', 'team management', 'quality control', 'Microsoft Excel', 'OBS', 'content production'],
            experience_years: 4,
            location: 'Bengaluru, India',
        },
        preferences: { city: 'bengaluru', country: 'in', location: 'Bengaluru, India', midasSearch: false },
    },
};

const name = process.argv[2] || 'mehdi';
const config = PROFILES[name];
if (!config) {
    console.error(`Unknown profile: ${name}. Choose: ${Object.keys(PROFILES).join(' | ')}`);
    process.exit(1);
}

const { profile, preferences } = config;
console.log(`\n${'='.repeat(60)}`);
console.log(`SCANNING: ${name.toUpperCase()} — "${profile.headline}"`);
console.log(`Skills: ${profile.skills.join(', ')}`);
console.log('='.repeat(60) + '\n');

let totalRaw = 0;
const allJobs = [];
const pendingScoring = [];

const onSourceComplete = (sourceName, jobs) => {
    totalRaw += jobs.length;
    const promise = (async () => {
        for (const job of jobs) {
            try {
                const result = await calculatePandaScore(job, profile, preferences, {});
                allJobs.push({ job, result, source: sourceName });
            } catch { /* skip */ }
        }
    })();
    pendingScoring.push(promise);
};

const onProgress = (msg) => process.stdout.write(`\r  ${msg.padEnd(58)}`);

try {
    await fetchAllJobsStreaming(profile, {}, onSourceComplete, onProgress, preferences);
} catch (err) {
    console.error('\nFetch error:', err.message);
}

await Promise.all(pendingScoring);
console.log('\n');

allJobs.sort((a, b) => b.result.score - a.result.score);
const displayed = allJobs.filter(x => x.result.score >= 30);

console.log(`Total raw: ${totalRaw} | Displayed (≥30): ${displayed.length}\n`);
console.log('TOP RESULTS:');

for (const { job, result: r, source } of displayed.slice(0, 20)) {
    const skills = (r.matches || []).map(m => m.skill).join(', ') || 'none';
    console.log(`  [${String(r.score).padStart(3)}] ${job.title} @ ${job.company} (${source})`);
    console.log(`        skills:[${skills}]`);
    console.log(`        sen:${r.multipliers.seniority} role:${r.multipliers.roleFamily} dom:${r.multipliers.domain}(${r.multipliers.domainDetail})`);
}

if (displayed.length === 0) {
    console.log('  (none above threshold — showing top 5)');
    for (const { job, result: r, source } of allJobs.slice(0, 5)) {
        console.log(`  [${String(r.score).padStart(3)}] ${job.title} @ ${job.company} (${source})`);
        console.log(`        skills:[${(r.matches||[]).map(m=>m.skill).join(', ')||'none'}] | role:${r.multipliers.roleFamily} dom:${r.multipliers.domain}(${r.multipliers.domainDetail})`);
    }
}
