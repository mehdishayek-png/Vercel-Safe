import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import 'dotenv/config'; // Automatically loads .env and .env.local

import { fetchAllJobs } from '../lib/job-fetcher.js';
import { calculatePandaScore } from '../lib/panda-matcher.js';

const candidates = [
    {
        name: 'Candidate A: Junior Frontend',
        profile: {
            headline: 'Junior React Developer',
            experience_years: 1,
            skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Tailwind']
        },
        preferences: { city: 'New York', state: 'NY', country: 'United States', location: 'New York, NY', superSearch: false }
    },
    {
        name: 'Candidate B: Senior Full Stack',
        profile: {
            headline: 'Senior Full Stack Engineer',
            experience_years: 8,
            skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker', 'System Design']
        },
        preferences: { city: 'San Francisco', state: 'CA', country: 'United States', location: 'San Francisco, CA', superSearch: false }
    },
    {
        name: 'Candidate C: Data Scientist',
        profile: {
            headline: 'Data Scientist',
            experience_years: 3,
            skills: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'TensorFlow']
        },
        preferences: { remoteOnly: true, superSearch: false } // Remote preference
    }
];

async function runSimulation() {
    console.log('\n--- 🐼 PANDA MATCHER REAL WORLD SIMULATION ---\n');

    // Force development mode so the SERP_DIAGNOSTIC logs print out
    process.env.NODE_ENV = 'development';
    const serapiKey = process.env.SERP_API_KEY;

    for (const candidate of candidates) {
        console.log(`\n============ 👤 ${candidate.name} (${candidate.profile.experience_years} years exp) ============`);
        console.log(`Headline: ${candidate.profile.headline}`);
        console.log(`Skills: ${candidate.profile.skills.join(', ')}\n`);

        console.log(`📡 Fetching jobs... (Location: ${candidate.preferences.remoteOnly ? 'Remote' : candidate.preferences.location})`);

        // Simulate real JobFetcher constraints
        const fetchResult = await fetchAllJobs(
            candidate.profile,
            { SERP_API_KEY: process.env.SERP_API_KEY }, // apiKeys
            (msg) => console.log(`  [Fetcher] ${msg}`),
            candidate.preferences
        );

        const jobs = fetchResult.jobs;
        console.log(`\n✅ Fetched ${jobs.length} jobs in total. Running Panda matcher to find top 3...\n`);

        // Match each job against Candidate
        const scoredJobs = [];
        for (const job of jobs) {
            const result = await calculatePandaScore(job, candidate.profile, candidate.preferences);
            scoredJobs.push({ job, result });
        }

        // Sort by Panda Score DESC
        scoredJobs.sort((a, b) => b.result.score - a.result.score);

        // Output Top 3
        const top3 = scoredJobs.slice(0, 3);
        for (let i = 0; i < top3.length; i++) {
            const { job, result } = top3[i];
            console.log(`  🏆 Rank #${i + 1}: ${job.title} at ${job.company}`);
            console.log(`     📍 Location: ${job.location || 'Not Specified'} (${job.source})`);
            console.log(`     🎯 Score: ${result.score}/100`);
            console.log(`     📊 Raw Keyword Score: ${result.raw}`);
            console.log(`     🔮 Multipliers: Seniority(${result.multipliers.seniority}), Location(${result.multipliers.location}), Prestige(${result.multipliers.prestige}), Recency(${result.multipliers.recency})`);
            const matchSkills = result.matches.map(m => m.skill).join(', ');
            console.log(`     ✨ Matched Skills: ${matchSkills || 'None'}`);
            console.log('  --------------------------------------------------');
        }
    }
}

runSimulation().catch(console.error);
