/**
 * Feature Engines Test Suite
 * Tests: Ghost Detection, JD Quality, Salary Prediction, Success Probability
 * Run: node test/feature-engines.mjs
 */

import { detectGhostSignals } from '../lib/ghost-detector.js';
import { analyzeJobQuality } from '../lib/jd-quality.js';
import { predictSalary } from '../lib/salary-predictor.js';
import { predictSuccessProbability } from '../lib/success-predictor.js';

const PASS = '✅';
const FAIL = '❌';
let passed = 0;
let failed = 0;

function assert(condition, name, detail = '') {
    if (condition) { console.log(`${PASS} ${name}`); passed++; }
    else { console.log(`${FAIL} ${name} — ${detail}`); failed++; }
}

// ═══════════════════════════════════════════════════════════════
// GHOST DETECTOR TESTS
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ GHOST DETECTOR ═══\n');

// Fresh, real job
const freshJob = {
    title: 'Senior React Developer',
    summary: `We are looking for a Senior React Developer to join our frontend team.

What you'll do:
- Build user-facing features using React and TypeScript
- Design and implement GraphQL APIs
- Collaborate with designers on new product features
- Participate in code reviews and technical discussions

Requirements:
- 5+ years React experience
- 3+ years TypeScript
- Experience with GraphQL
- Strong communication skills

Benefits: health insurance, 401k, remote-friendly. Reports to Engineering Manager.`,
    company: 'TechCorp',
    location: 'San Francisco, CA',
    date_posted: new Date().toISOString(),
    salary_min: 150000,
    salary_max: 200000,
};
const freshResult = detectGhostSignals(freshJob);
assert(freshResult.status === 'fresh', 'Fresh job with salary + recent date = fresh', `got ${freshResult.status} (score ${freshResult.ghostScore})`);
assert(freshResult.ghostScore <= 15, 'Fresh job ghost score <= 15', `got ${freshResult.ghostScore}`);

// Stale job — 45 days old, no salary
const staleJob = {
    title: 'Marketing Manager',
    summary: 'We are looking for a Marketing Manager. Competitive salary. Fast-paced environment. Must be a self-starter. Hit the ground running.',
    company: 'VagueCorp',
    location: 'Remote',
    date_posted: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
};
const staleResult = detectGhostSignals(staleJob);
assert(staleResult.status === 'stale' || staleResult.status === 'likely_ghost', 'Old + no salary + vague description = stale/ghost', `got ${staleResult.status} (score ${staleResult.ghostScore})`);
assert(staleResult.ghostScore >= 36, 'Stale job ghost score >= 36', `got ${staleResult.ghostScore}`);

// Unrealistic requirements — entry level wanting 10 years
const unrealisticJob = {
    title: 'Junior Developer',
    summary: 'Looking for a Junior Developer with 10+ years of experience in React, Node.js, Python, Java, C++, Rust, Go, Kubernetes, Terraform, Docker, AWS, GCP, Azure, MongoDB, PostgreSQL, Redis, GraphQL.',
    company: 'BadHiring Inc',
    location: 'New York, NY',
    date_posted: new Date().toISOString(),
    salary_min: 50000,
};
const unrealisticResult = detectGhostSignals(unrealisticJob);
assert(unrealisticResult.details.hasUnrealisticRequirements === true, 'Junior + 10yr = unrealistic', `got ${unrealisticResult.details.hasUnrealisticRequirements}`);
assert(unrealisticResult.signals.length > 0, 'Has warning signals', `got ${unrealisticResult.signals.length} signals`);

// Tech age mismatch — 15 years of Kubernetes (born 2014)
const techAgeJob = {
    title: 'DevOps Engineer',
    summary: 'Requires 15 years of experience in Kubernetes and 12 years of experience in Docker.',
    company: 'TimeTravelCorp',
    location: 'Austin, TX',
    date_posted: new Date().toISOString(),
    salary_min: 120000,
};
const techAgeResult = detectGhostSignals(techAgeJob);
assert(techAgeResult.details.hasUnrealisticRequirements === true, 'Tech age mismatch detected', `got ${techAgeResult.details.hasUnrealisticRequirements}`);

// ═══════════════════════════════════════════════════════════════
// JD QUALITY TESTS
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JD QUALITY ═══\n');

// High quality JD
const goodJD = {
    title: 'Senior Frontend Engineer',
    summary: `We're looking for a Senior Frontend Engineer to join our Growth team.

What you'll do:
- Build and optimize user-facing features using React and TypeScript
- Collaborate with designers and product managers
- Mentor junior engineers and review code

Requirements:
- 5+ years React experience
- Strong TypeScript skills
- Experience with A/B testing frameworks

Nice to have:
- GraphQL experience
- Performance optimization background

Compensation: $150,000 - $200,000 base + equity
Benefits: Health, dental, vision, 401k match, remote-friendly, unlimited learning budget
Team: You'll report to the Engineering Manager on the Growth squad (6 engineers)
Growth: Clear IC track from Senior → Staff → Principal

Interview process: Phone screen → Technical round → System design → Team fit → Offer`,
    company: 'GoodCo',
    location: 'San Francisco, CA (Remote OK)',
    salary_min: 150000,
    salary_max: 200000,
};
const goodQuality = analyzeJobQuality(goodJD);
assert(goodQuality.qualityScore >= 70, 'Good JD scores >= 70', `got ${goodQuality.qualityScore}`);
assert(goodQuality.flags.green.length >= 3, 'Good JD has 3+ green flags', `got ${goodQuality.flags.green.length}`);
assert(goodQuality.flags.red.length <= 1, 'Good JD has <= 1 red flags', `got ${goodQuality.flags.red.length}: ${goodQuality.flags.red.join(', ')}`);

// Terrible JD — red flag minefield
const badJD = {
    title: 'Full Stack Rockstar Ninja',
    summary: `We're like a family here. Looking for a rockstar ninja who can wear many hats in our fast-paced environment. Must be able to work under pressure and hit the ground running. Competitive salary. We need someone aggressive and dominant who can do what it takes. Other duties as assigned. Must have thick skin.`,
    company: 'ToxicStartup',
    location: 'Unknown',
};
const badQuality = analyzeJobQuality(badJD);
assert(badQuality.qualityScore <= 40, 'Terrible JD scores <= 40', `got ${badQuality.qualityScore}`);
assert(badQuality.flags.red.length >= 4, 'Terrible JD has 4+ red flags', `got ${badQuality.flags.red.length}: ${badQuality.flags.red.join(', ')}`);
assert(badQuality.inclusivity === 'biased', 'Heavily masculine JD = biased', `got ${badQuality.inclusivity}`);

// ═══════════════════════════════════════════════════════════════
// SALARY PREDICTOR TESTS
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ SALARY PREDICTOR ═══\n');

// Known salary — should pass through
const knownSalaryJob = {
    title: 'Product Manager',
    summary: 'Product management role.',
    company: 'Corp',
    location: 'NYC',
    salary_min: 130000,
    salary_max: 170000,
};
const knownResult = predictSalary(knownSalaryJob);
assert(knownResult.estimated === false, 'Known salary = not estimated', `got estimated=${knownResult.estimated}`);
assert(knownResult.min === 130000, 'Passes through known min', `got ${knownResult.min}`);

// Senior Engineer in SF — should predict $150K-$200K range (USD)
const sfEngineer = {
    title: 'Senior Software Engineer',
    summary: 'Build distributed systems with React, TypeScript, and AWS. 5+ years experience required. Team of 8 engineers.',
    company: 'BigTech',
    location: 'San Francisco, CA',
};
const sfResult = predictSalary(sfEngineer);
assert(sfResult.estimated === true, 'No salary = estimated', `got estimated=${sfResult.estimated}`);
assert(sfResult.currency === 'USD', 'SF = USD', `got ${sfResult.currency}`);
assert(sfResult.min >= 120000 && sfResult.min <= 200000, 'Sr Eng SF min in range 120K-200K', `got ${sfResult.min}`);
assert(sfResult.confidence === 'high' || sfResult.confidence === 'medium', 'Confidence >= medium', `got ${sfResult.confidence}`);

// Junior Developer in Bengaluru — should predict INR
const blrJunior = {
    title: 'Junior Frontend Developer',
    summary: 'Entry level React developer position. 0-2 years experience. HTML, CSS, JavaScript, React.',
    company: 'IndianStartup',
    location: 'Bengaluru, India',
};
const blrResult = predictSalary(blrJunior);
assert(blrResult.estimated === true, 'Estimated salary', `got ${blrResult.estimated}`);
assert(blrResult.currency === 'INR', 'Bengaluru = INR', `got ${blrResult.currency}`);
assert(blrResult.min >= 200000 && blrResult.max <= 3000000, 'Junior BLR range reasonable in INR', `got ₹${blrResult.min}-${blrResult.max}`);

// Salary string parsing
const salaryStringJob = {
    title: 'Designer',
    summary: 'Design role',
    company: 'Co',
    location: 'NYC',
    salary: '$120k - $160k',
};
const parsedResult = predictSalary(salaryStringJob);
assert(parsedResult.estimated === false, 'Parsed from string = not estimated', `got ${parsedResult.estimated}`);
assert(parsedResult.min >= 115000 && parsedResult.min <= 125000, 'Parsed $120k correctly', `got ${parsedResult.min}`);

// ═══════════════════════════════════════════════════════════════
// SUCCESS PROBABILITY TESTS
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ SUCCESS PROBABILITY ═══\n');

const strongProfile = {
    headline: 'Senior React Developer',
    skills: ['React', 'TypeScript', 'GraphQL', 'Node.js', 'AWS', 'Docker', 'CI/CD', 'Jest'],
    experience_years: 6,
};

const strongMatchPanda = {
    score: 85,
    raw: 90,
    matches: [
        { skill: 'React', value: 20 },
        { skill: 'TypeScript', value: 15 },
        { skill: 'GraphQL', value: 12 },
        { skill: 'Node.js', value: 10 },
        { skill: 'AWS', value: 8 },
    ],
    multipliers: {
        seniority: '1.13',
        location: '1.50',
        roleFamily: '1.10',
        domain: '1.05',
        domainDetail: 'match',
        depth: '1.15',
        coherence: '1.00',
        recency: '1.15',
        prestige: '1.00',
        quality: '1.00',
        negative: '1.00',
        semantic: '1.00',
    },
};

const strongMatchJob = {
    title: 'Senior React Developer',
    summary: 'Requirements: 5+ years React, TypeScript, GraphQL experience. Nice to have: Node.js, AWS, Docker. Build features for our growth platform.',
    company: 'TechCo',
    location: 'San Francisco, CA',
    date_posted: new Date().toISOString(),
};

const strongSuccess = predictSuccessProbability(strongMatchJob, strongProfile, strongMatchPanda);
assert(strongSuccess.probability === 'high', 'Strong match = high probability', `got ${strongSuccess.probability}`);
assert(strongSuccess.percentage >= 30, 'Strong match >= 30% callback', `got ${strongSuccess.percentage}%`);
assert(strongSuccess.strengths.length >= 2, 'Has 2+ strengths', `got ${strongSuccess.strengths.length}`);
assert(strongSuccess.headline.length > 0, 'Has headline', `empty headline`);

// Weak match — CX person for Engineering role
const weakPanda = {
    score: 12,
    raw: 5,
    matches: [],
    multipliers: {
        seniority: '1.00',
        location: '1.50',
        roleFamily: '0.40',
        domain: '0.30',
        domainDetail: 'mismatch',
        depth: '1.00',
        coherence: '1.00',
        recency: '1.00',
        prestige: '1.00',
        quality: '1.00',
        negative: '1.00',
        semantic: '1.00',
    },
};

const weakProfile = {
    headline: 'Customer Experience Specialist',
    skills: ['CX', 'Zendesk', 'NPS'],
    experience_years: 4,
};

const weakSuccess = predictSuccessProbability(strongMatchJob, weakProfile, weakPanda);
assert(weakSuccess.probability === 'very_low' || weakSuccess.probability === 'low', 'CX for Eng role = low/very_low', `got ${weakSuccess.probability}`);
assert(weakSuccess.percentage <= 10, 'Weak match <= 10% callback', `got ${weakSuccess.percentage}%`);
assert(weakSuccess.gaps.length >= 1, 'Has gap warnings', `got ${weakSuccess.gaps.length}`);

// ═══════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════
console.log(`\n═══ RESULTS: ${passed} passed, ${failed} failed ═══`);
process.exit(failed > 0 ? 1 : 0);
