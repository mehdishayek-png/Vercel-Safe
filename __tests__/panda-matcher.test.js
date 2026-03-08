import { describe, it, expect, vi } from 'vitest';
import { calculatePandaScore } from '../lib/panda-matcher';

// Helper to build a minimal job object
function makeJob(overrides = {}) {
    return {
        title: 'Customer Experience Specialist',
        company: 'Acme Inc',
        location: 'Bengaluru, Karnataka, India',
        summary: 'Work with customers using Zendesk, manage CX workflows, handle SaaS onboarding and automation.',
        date_posted: new Date().toISOString(),
        ...overrides,
    };
}

// Helper to build a minimal profile
function makeProfile(overrides = {}) {
    return {
        name: 'Test User',
        headline: 'Customer Experience Specialist',
        skills: ['CX', 'Zendesk', 'SaaS', 'Automation', 'SSO', 'CRM'],
        experience_years: 5,
        ...overrides,
    };
}

const defaultPrefs = { country: 'in', city: 'bengaluru', state: 'karnataka', location: 'Bengaluru, Karnataka, India' };

describe('calculatePandaScore', () => {
    // ========================================
    // KEYWORD MATCHING
    // ========================================
    describe('keyword matching', () => {
        it('returns a positive score when skills match the job', async () => {
            const result = await calculatePandaScore(makeJob(), makeProfile(), defaultPrefs);
            expect(result.score).toBeGreaterThan(50);
            expect(result.matches.length).toBeGreaterThan(0);
        });

        it('returns a low score when no skills match', async () => {
            const job = makeJob({ title: 'Truck Driver', summary: 'Drive trucks across the country' });
            const result = await calculatePandaScore(job, makeProfile(), defaultPrefs);
            expect(result.score).toBeLessThan(30);
        });

        it('awards higher points to short technical acronyms', async () => {
            const profile = makeProfile({ skills: ['SSO', 'CX'] });
            const job = makeJob({ summary: 'Must know SSO and CX workflows' });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            const ssoMatch = result.matches.find(m => m.skill === 'SSO');
            expect(ssoMatch).toBeDefined();
            expect(ssoMatch.value).toBeGreaterThan(10);
        });
    });

    // ========================================
    // SENIORITY GATING
    // ========================================
    describe('seniority', () => {
        it('penalizes Senior titles for mid-level candidates (<6y)', async () => {
            const job = makeJob({ title: 'Senior CX Lead' });
            const profile = makeProfile({ experience_years: 4 });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.seniority)).toBeLessThanOrEqual(0.35);
        });

        it('penalizes Manager titles for mid-level candidates (<6y)', async () => {
            const job = makeJob({ title: 'Customer Support Manager' });
            const profile = makeProfile({ experience_years: 5 });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.seniority)).toBeLessThanOrEqual(0.55);
        });

        it('buffs Manager titles for manager-ready candidates (6-9y)', async () => {
            const job = makeJob({ title: 'Customer Support Manager' });
            const profile = makeProfile({ experience_years: 7 });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.seniority)).toBeGreaterThanOrEqual(1.2);
        });

        it('hard-blocks Senior titles for junior candidates (<2y)', async () => {
            const job = makeJob({ title: 'Senior Director of Engineering' });
            const profile = makeProfile({ experience_years: 1 });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.seniority)).toBeLessThanOrEqual(0.05);
            expect(result.score).toBeLessThanOrEqual(30);
        });

        it('hard-blocks intern jobs for senior candidates', async () => {
            const job = makeJob({ title: 'CX Intern' });
            const profile = makeProfile({ experience_years: 12 });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.seniority)).toBeLessThanOrEqual(0.01);
        });

        it('buffs mid-level jobs for mid-level candidates', async () => {
            const job = makeJob({ title: 'Customer Experience Specialist' });
            const profile = makeProfile({ experience_years: 4 });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.seniority)).toBeGreaterThanOrEqual(1.2);
        });
    });

    // ========================================
    // LOCATION
    // ========================================
    describe('location', () => {
        it('gives a buff for exact city match', async () => {
            const result = await calculatePandaScore(makeJob(), makeProfile(), defaultPrefs);
            expect(parseFloat(result.multipliers.location)).toBe(1.5);
        });

        it('nearly kills score for wrong country', async () => {
            const job = makeJob({ location: 'San Francisco, CA, United States' });
            const result = await calculatePandaScore(job, makeProfile(), defaultPrefs);
            expect(parseFloat(result.multipliers.location)).toBeLessThanOrEqual(0.02);
        });

        it('applies remote buff for remote jobs in same country', async () => {
            const job = makeJob({ title: 'Remote CX Specialist', location: 'Remote, India' });
            const result = await calculatePandaScore(job, makeProfile(), defaultPrefs);
            expect(parseFloat(result.multipliers.location)).toBeGreaterThanOrEqual(1.0);
        });
    });

    // ========================================
    // ROLE FAMILY
    // ========================================
    describe('role family', () => {
        it('buffs same-family matches', async () => {
            const job = makeJob({ title: 'Customer Success Manager' });
            const profile = makeProfile({ headline: 'Customer Experience Specialist', experience_years: 8 });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.roleFamily)).toBe(1.1);
        });

        it('penalizes cross-family matches', async () => {
            const job = makeJob({ title: 'Staff Software Engineer', summary: 'Build APIs with Python, AWS, Docker' });
            const profile = makeProfile({ headline: 'Customer Experience Specialist' });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.roleFamily)).toBeLessThanOrEqual(0.4);
        });

        it('softens cross-family penalty in explore mode', async () => {
            const job = makeJob({ title: 'Staff Software Engineer', summary: 'Build APIs with Python, AWS, Docker' });
            const profile = makeProfile({ headline: 'Customer Experience Specialist' });
            const result = await calculatePandaScore(job, profile, { ...defaultPrefs, exploreAdjacent: true });
            expect(parseFloat(result.multipliers.roleFamily)).toBeGreaterThan(0.4);
        });
    });

    // ========================================
    // NEGATIVE KEYWORDS
    // ========================================
    describe('negative keywords', () => {
        it('kills score for scam/irrelevant jobs', async () => {
            const job = makeJob({ title: 'CEO and Founder', summary: 'Looking for a co-founder for crypto startup' });
            const result = await calculatePandaScore(job, makeProfile(), defaultPrefs);
            expect(result.score).toBeLessThanOrEqual(5);
        });
    });

    // ========================================
    // COHERENCE CHECK
    // ========================================
    describe('title-description coherence', () => {
        it('penalizes when keyword only matches in title, not description', async () => {
            const job = makeJob({
                title: 'Customer Experience Manager - Domestic EL',
                summary: 'Meet prospective institutions and colleges. Download nuances of loan products. Collect documentation. B2B sales for education loan.',
            });
            const profile = makeProfile({ skills: ['Customer Experience'], headline: 'CX Specialist' });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.coherence)).toBeLessThanOrEqual(0.4);
        });

        it('does NOT penalize when keywords appear in description', async () => {
            const job = makeJob({
                title: 'Customer Experience Specialist',
                summary: 'Handle CX workflows, manage Zendesk tickets, SaaS onboarding',
            });
            const profile = makeProfile({ skills: ['CX', 'Zendesk', 'SaaS'] });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.coherence)).toBe(1.0);
        });
    });

    // ========================================
    // DEPTH MULTIPLIER
    // ========================================
    describe('depth multiplier', () => {
        it('penalizes shallow L1 support jobs for deep candidates', async () => {
            const job = makeJob({ summary: 'Answer inbound calls, help desk, tier 1 support, phone support' });
            const profile = makeProfile({ skills: ['SSO', 'SAML', 'Okta', 'API', 'Zendesk', 'Automation'] });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.depth)).toBeLessThanOrEqual(0.6);
        });

        it('buffs deep jobs for deep candidates', async () => {
            const job = makeJob({ summary: 'Work with SSO, SAML, API integrations, platform onboarding, enterprise SaaS automation' });
            const profile = makeProfile({ skills: ['SSO', 'SAML', 'API', 'Automation'] });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(parseFloat(result.multipliers.depth)).toBeGreaterThanOrEqual(1.1);
        });
    });

    // ========================================
    // RECENCY
    // ========================================
    describe('recency', () => {
        it('buffs very recent jobs', async () => {
            const job = makeJob({ date_posted: new Date().toISOString() });
            const result = await calculatePandaScore(job, makeProfile(), defaultPrefs);
            expect(parseFloat(result.multipliers.recency)).toBeGreaterThanOrEqual(1.1);
        });

        it('penalizes old jobs (>21 days)', async () => {
            const old = new Date();
            old.setDate(old.getDate() - 25);
            const job = makeJob({ date_posted: old.toISOString() });
            const result = await calculatePandaScore(job, makeProfile(), defaultPrefs);
            expect(parseFloat(result.multipliers.recency)).toBeLessThanOrEqual(0.15);
        });
    });

    // ========================================
    // SCORE CAPPING
    // ========================================
    describe('score caps', () => {
        it('caps score at 100', async () => {
            // Create ideal conditions to push score high
            const job = makeJob({ company: 'Google' });
            const profile = makeProfile({ skills: ['CX', 'Zendesk', 'SaaS', 'Automation', 'SSO', 'CRM', 'API', 'Okta', 'SAML', 'Jira'], experience_years: 5 });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(result.score).toBeLessThanOrEqual(100);
        });

        it('caps cross-family score at 50 in normal mode', async () => {
            const job = makeJob({
                title: 'Staff Software Engineer',
                summary: 'Build backend with CX tools, Zendesk API, SaaS automation, SSO integration',
            });
            const profile = makeProfile({ headline: 'Customer Experience Specialist' });
            const result = await calculatePandaScore(job, profile, defaultPrefs);
            expect(result.score).toBeLessThanOrEqual(50);
        });
    });

    // ========================================
    // PRESTIGE
    // ========================================
    describe('prestige', () => {
        it('buffs prestigious company matches', async () => {
            const job = makeJob({ company: 'Google' });
            const result = await calculatePandaScore(job, makeProfile(), defaultPrefs);
            expect(parseFloat(result.multipliers.prestige)).toBeGreaterThan(1.0);
        });

        it('no change for unknown companies', async () => {
            const job = makeJob({ company: 'Random Startup LLC' });
            const result = await calculatePandaScore(job, makeProfile(), defaultPrefs);
            expect(parseFloat(result.multipliers.prestige)).toBe(1.0);
        });
    });
});
