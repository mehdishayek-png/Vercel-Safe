import { buildQueries } from '../lib/job-fetcher.js';
import { calculatePandaScore } from '../lib/panda-matcher.js';

const profile = {
    headline: 'Customer Experience Specialist',
    skills: ['sso', 'saml', 'okta', 'aws', 'technical troubleshooting', 'customer support', 'workato', 'zendesk'],
    industry: 'SaaS',
    experience_years: 5
};

console.log('Queries Generated:');
console.dir(buildQueries(profile, { location: 'Remote', remoteOnly: true }), { depth: null });

const job1 = {
    title: 'Customer Support Specialist',
    summary: 'Must have great customer support and technical troubleshooting skills.',
    company: 'Zendesk'
};

const job2 = {
    title: 'SaaS Integration Engineer',
    summary: 'Looking for someone with sso, saml and okta experience. Workato is a plus.',
    company: 'Okta'
};

async function run() {
    console.log('\n--- MATCHING JOB 1 (Basic Support) ---');
    console.dir(await calculatePandaScore(job1, profile, {}), { depth: null });

    console.log('\n--- MATCHING JOB 2 (SaaS Integration) ---');
    console.dir(await calculatePandaScore(job2, profile, {}), { depth: null });
}
run();
