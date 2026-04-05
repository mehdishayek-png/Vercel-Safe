/**
 * Scoring Audit Verification — tests the 5 required test cases from the April 3 audit.
 * Run: node test/scoring-audit-verify.mjs
 */
import { calculatePandaScore } from '../lib/panda-matcher.js';

const PASS = '✅';
const FAIL = '❌';
let passed = 0;
let failed = 0;

function assert(condition, name, detail) {
    if (condition) {
        console.log(`${PASS} ${name}`);
        passed++;
    } else {
        console.log(`${FAIL} ${name} — ${detail}`);
        failed++;
    }
}

// ── Test Profiles ──────────────────────────────────────────────
const cxProfile = {
    headline: 'Customer Experience Specialist',
    skills: ['CX', 'Customer Experience', 'Zendesk', 'Intercom', 'Onboarding', 'NPS', 'CSAT', 'Retention', 'B2B', 'SaaS'],
    experience_years: 5,
};

const cxPrefs = { city: 'bengaluru', state: 'karnataka', country: 'in' };

const financeProfile = {
    headline: 'Financial Analyst',
    skills: ['Financial Modeling', 'Excel', 'DCF', 'Valuation', 'Budgeting', 'Forecasting'],
    experience_years: 4,
};

const financePrefs = { city: 'mumbai', state: 'maharashtra', country: 'in' };

const aiOpsProfile = {
    headline: 'AI Product Operations & Workflow Automation',
    skills: ['AI', 'Workato', 'Claude', 'Chatbot', 'Automation', 'Workflow', 'Product Operations', 'API'],
    experience_years: 8,
};

const aiOpsPrefs = { city: 'bengaluru', state: 'karnataka', country: 'in' };

// ── Test 1: Exact title match should score 75+ ────────────────
async function test1() {
    console.log('\n─── Test 1: Exact title match should be #1 with score 75+ ───');
    const job = {
        title: 'Customer Experience Specialist',
        summary: 'We are looking for a Customer Experience Specialist to manage onboarding, retention, and NPS tracking. You will use Zendesk and Intercom to handle customer interactions. B2B SaaS experience preferred.',
        company: 'TechCorp',
        location: 'Bengaluru, India',
    };
    const result = await calculatePandaScore(job, cxProfile, cxPrefs);
    console.log(`  Score: ${result.score}, Raw: ${result.raw}, Matches: ${result.matches.length}`);
    console.log(`  Multipliers:`, JSON.stringify(result.multipliers));
    assert(result.score >= 75, 'CX Specialist exact match >= 75', `got ${result.score}`);
}

// ── Test 2: Generic overlap should NOT score 94 ──────────────
async function test2() {
    console.log('\n─── Test 2: Generic "Product Ops Specialist" should NOT score 94 for AI role ───');
    const genericProfile = {
        headline: 'Product Operations Specialist',
        skills: ['Operations', 'Product', 'Stakeholder Management', 'Excel', 'Process Improvement'],
        experience_years: 5,
    };
    const job = {
        title: 'AI Product Operations & Workflow Automation',
        summary: 'Looking for someone to build AI-powered workflow automation using Workato, Claude API, and chatbot systems. Must have deep experience with LLMs, prompt engineering, and API integrations.',
        company: 'AIStartup',
        location: 'Bengaluru, India',
    };
    const result = await calculatePandaScore(job, genericProfile, { city: 'bengaluru', state: 'karnataka', country: 'in' });
    console.log(`  Score: ${result.score}, Raw: ${result.raw}, Matches: ${result.matches.length}`);
    console.log(`  Multipliers:`, JSON.stringify(result.multipliers));
    assert(result.score < 60, 'Generic Prod Ops for AI role < 60', `got ${result.score}`);
}

// ── Test 3: .NET Developer should NEVER appear for CX search ─
async function test3() {
    console.log('\n─── Test 3: .NET Developer should never appear for CX Specialist ───');
    const job = {
        title: '.NET Developer',
        summary: 'C# .NET developer needed for enterprise application development. ASP.NET Core, Entity Framework, SQL Server, Azure DevOps. 5+ years experience required.',
        company: 'SoftwareHouse',
        location: 'Bengaluru, India',
    };
    const result = await calculatePandaScore(job, cxProfile, cxPrefs);
    console.log(`  Score: ${result.score}, Raw: ${result.raw}, Matches: ${result.matches.length}`);
    console.log(`  Multipliers:`, JSON.stringify(result.multipliers));
    assert(result.score < 30, '.NET Dev for CX profile < 30 (quality threshold)', `got ${result.score}`);
}

// ── Test 4: Finance profile should still see SOME results ─────
async function test4() {
    console.log('\n─── Test 4: Finance profile should see results (not blank page) ───');
    const job = {
        title: 'Financial Analyst',
        summary: 'Seeking a Financial Analyst for budgeting, forecasting, and financial modeling. Excel proficiency required. DCF analysis and valuation experience preferred. Support M&A due diligence.',
        company: 'FinanceCorp',
        location: 'Mumbai, India',
    };
    const result = await calculatePandaScore(job, financeProfile, financePrefs);
    console.log(`  Score: ${result.score}, Raw: ${result.raw}, Matches: ${result.matches.length}`);
    console.log(`  Multipliers:`, JSON.stringify(result.multipliers));
    assert(result.score >= 50, 'Finance exact match >= 50', `got ${result.score}`);
}

// ── Test 5: Niche tools (Workato, Claude, Chatbot) should boost ─
async function test5() {
    console.log('\n─── Test 5: Niche tools should boost relevant jobs significantly ───');
    const job = {
        title: 'AI Operations & Automation Lead',
        summary: 'Build AI-powered automation using Workato, Claude API, and custom chatbot solutions. Deep API integration experience required. Workflow automation for enterprise clients.',
        company: 'AutomationCo',
        location: 'Bengaluru, India',
    };
    const result = await calculatePandaScore(job, aiOpsProfile, aiOpsPrefs);
    console.log(`  Score: ${result.score}, Raw: ${result.raw}, Matches: ${result.matches.length}`);
    console.log(`  Matched skills:`, result.matches.map(m => `${m.skill}(${m.value})`).join(', '));
    console.log(`  Multipliers:`, JSON.stringify(result.multipliers));
    assert(result.score >= 65, 'Niche tools AI Ops match >= 65', `got ${result.score}`);

    // Also verify Workato/Claude individually contribute meaningful value
    const workatoMatch = result.matches.find(m => m.skill.toLowerCase() === 'workato');
    const claudeMatch = result.matches.find(m => m.skill.toLowerCase() === 'claude');
    if (workatoMatch) assert(workatoMatch.value >= 10, 'Workato contributes >= 10 points', `got ${workatoMatch.value}`);
    if (claudeMatch) assert(claudeMatch.value >= 8, 'Claude contributes >= 8 points', `got ${claudeMatch.value}`);
}

// ── Bonus Test: Location override prevention ──────────────────
async function testLocationCap() {
    console.log('\n─── Bonus: Singapore job should NOT score well for Bengaluru search ───');
    const job = {
        title: 'Customer Experience Specialist',
        summary: 'CX Specialist for our Singapore office. Zendesk, Intercom, NPS, onboarding, retention management.',
        company: 'SingaporeTech',
        location: 'Singapore',
    };
    const result = await calculatePandaScore(job, cxProfile, cxPrefs);
    console.log(`  Score: ${result.score}, Location mult: ${result.multipliers.location}`);
    assert(result.score <= 15, 'Singapore job for Bengaluru search <= 15', `got ${result.score}`);
}

// ── Run All ───────────────────────────────────────────────────
async function main() {
    console.log('=== SCORING AUDIT VERIFICATION ===\n');
    await test1();
    await test2();
    await test3();
    await test4();
    await test5();
    await testLocationCap();
    console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
