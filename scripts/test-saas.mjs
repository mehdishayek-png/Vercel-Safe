import { buildQueries } from '../lib/job-fetcher.js';
import { calculatePandaScore } from '../lib/panda-matcher.js';

const profile = {
    headline: 'Customer Experience Specialist',
    skills: ['sso', 'saml', 'okta', 'aws', 'technical troubleshooting', 'customer support', 'workato', 'zendesk'],
    industry: 'SaaS',
    experience_years: 5
};

console.log('=== QUERY GENERATION ===');
console.dir(buildQueries(profile, { location: 'Remote', remoteOnly: true }), { depth: null });

// --- JOB DEFINITIONS ---

const job1_basic = {
    title: 'Customer Support Specialist',
    summary: 'Handle inbound calls and emails from customers. Basic ticket resolution and chat support.',
    company: 'Zendesk',
    date_posted: new Date().toISOString()
};

const job2_saas_integration = {
    title: 'SaaS Integration Engineer',
    summary: 'Looking for someone with sso, saml and okta experience. Workato and API integration is a plus. B2B enterprise platform work.',
    company: 'Okta',
    date_posted: new Date().toISOString()
};

const job3_call_center = {
    title: 'Customer Service Representative',
    summary: 'Answering calls and responding to emails in a call center environment. Tier 1 phone support for our customers.',
    company: 'Generic BPO Inc',
    date_posted: new Date().toISOString()
};

const job4_strategic_cx = {
    title: 'Customer Success Manager, B2B SaaS',
    summary: 'Drive platform adoption, reduce churn, manage enterprise onboarding. SSO/SAML integrations, health score monitoring, renewal management. Salesforce and Zendesk required.',
    company: 'Gainsight',
    date_posted: new Date().toISOString()
};

const job5_tam = {
    title: 'Technical Account Manager',
    summary: 'Own post-sales technical relationships for enterprise accounts. Deep integration work with Okta, Workato, and AWS. Drive customer retention and expansion.',
    company: 'Salesforce',
    date_posted: new Date().toISOString()
};

const job6_helpdesk = {
    title: 'Help Desk Agent',
    summary: 'L1 support. Reset passwords, handle basic ticket resolution. No technical skills required.',
    company: 'TCS',
    date_posted: new Date().toISOString()
};

// These are the EXACT matches from the live app that should NOT rank highly
const job7_staff_engineer = {
    title: 'Staff Engineer',
    summary: 'Get to know Okta. We free everyone to safely use any technology, anywhere, on any device or app. Our flexible and neutral products, Okta Platform and Auth0 Platform, provide secure access, authentication, and automation, placing identity at the core of business security and growth.',
    company: 'Okta, Inc.',
    location: 'Bengaluru, Karnataka, India',
    date_posted: new Date(Date.now() - 17 * 86400000).toISOString()
};

const job8_swe_test = {
    title: 'Staff Software Engineer in Test',
    summary: 'Get to know Okta. We free everyone to safely use any technology, anywhere, on any device or app. Our flexible and neutral products, Okta Platform and Auth0 Platform, provide secure access, authentication, and automation.',
    company: 'Okta, Inc.',
    location: 'Bengaluru, Karnataka, India',
    date_posted: new Date(Date.now() - 22 * 86400000).toISOString()
};

const job9_iam_engineer = {
    title: 'Senior Okta IAM Engineer (Identity)',
    summary: 'Senior Okta IAM Engineer Identity & Application Security. Responsible for designing, implementing, and supporting secure, scalable identity and access management solutions. SSO, SAML, authentication.',
    company: 'Qwickly Ventures',
    location: 'Hyderabad, Telangana, India',
    date_posted: new Date(Date.now() - 8 * 86400000).toISOString()
};

const allJobs = [
    { label: 'Basic Support', job: job1_basic },
    { label: 'SaaS Integration Engineer', job: job2_saas_integration },
    { label: 'Call Center Rep', job: job3_call_center },
    { label: 'Strategic CSM (B2B SaaS)', job: job4_strategic_cx },
    { label: 'Technical Account Manager', job: job5_tam },
    { label: 'Help Desk Agent (L1)', job: job6_helpdesk },
    { label: '❌ Staff Engineer @Okta', job: job7_staff_engineer },
    { label: '❌ Staff SWE in Test @Okta', job: job8_swe_test },
    { label: '❌ Sr IAM Engineer', job: job9_iam_engineer },
];

async function run() {
    console.log('\n=== PANDA SCORING: Unconventional CX Profile ===');
    console.log(`Profile: ${profile.headline} | ${profile.experience_years}yr | Skills: ${profile.skills.join(', ')}\n`);

    const results = [];

    for (const { label, job } of allJobs) {
        const result = await calculatePandaScore(job, profile, {});
        results.push({ label, score: result.score, depth: result.multipliers.depth, raw: result.raw, matches: result.matches.map(m => m.skill).join(', ') });
        console.log(`${result.score.toString().padStart(3)} | depth:${result.multipliers.depth} | ${label.padEnd(30)} | "${job.title}" at ${job.company}`);
        console.log(`     Matched: ${result.matches.map(m => `${m.skill}(${m.value})`).join(', ') || 'None'}`);
    }

    console.log('\n=== VALIDATION ===');
    const basicScore = results.find(r => r.label === 'Basic Support')?.score || 0;
    const saasScore = results.find(r => r.label === 'SaaS Integration Engineer')?.score || 0;
    const callCenterScore = results.find(r => r.label === 'Call Center Rep')?.score || 0;
    const csmScore = results.find(r => r.label === 'Strategic CSM (B2B SaaS)')?.score || 0;
    const tamScore = results.find(r => r.label === 'Technical Account Manager')?.score || 0;
    const helpdeskScore = results.find(r => r.label === 'Help Desk Agent (L1)')?.score || 0;

    const pass = (condition, msg) => console.log(condition ? `  ✅ PASS: ${msg}` : `  ❌ FAIL: ${msg}`);

    pass(callCenterScore < 30, `Call Center Rep (${callCenterScore}) < 30`);
    pass(helpdeskScore < 30, `Help Desk Agent (${helpdeskScore}) < 30`);
    pass(basicScore < saasScore, `Basic Support (${basicScore}) < SaaS Integration (${saasScore})`);
    pass(csmScore > 50, `Strategic CSM (${csmScore}) > 50`);
    pass(tamScore > 50, `Technical Account Manager (${tamScore}) > 50`);
    pass(saasScore > 50, `SaaS Integration Engineer (${saasScore}) > 50`);
    pass(tamScore > basicScore, `TAM (${tamScore}) > Basic Support (${basicScore})`);
    pass(csmScore > callCenterScore, `CSM (${csmScore}) > Call Center (${callCenterScore})`);
}

run();
