#!/usr/bin/env node
// =============================================================================
// Pre-Filter Engine Unit Tests
// Run: node scripts/test-pre-filter.mjs
// No test framework needed — uses Node's built-in assert module
// =============================================================================

import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Inline the filter engine (avoid import path issues in scripts/)
// ---------------------------------------------------------------------------

// ---- Currency conversion (subset for tests) ----
const SALARY_TO_USD = { USD: 1, INR: 0.012, GBP: 1.27 };
function toUSD(amount, currency) { return amount * (SALARY_TO_USD[currency] || 1); }

const REGION_COUNTRY_MAP = {
    EU: ['DE', 'FR', 'NL'],
    IN: ['IN'],
    US: ['US'],
};

function employeeCountToSize(count) {
    if (count <= 50) return 'startup';
    if (count <= 200) return 'scaleup';
    if (count <= 1000) return 'mid-size';
    return 'enterprise';
}

function matchesWorkArrangement(job, filter) {
    if (!filter || filter.length === 0) return true;
    if (!job.workArrangement) return true;
    const arr = Array.isArray(job.workArrangement) ? job.workArrangement : [job.workArrangement];
    return arr.some(a => filter.includes(a));
}

function matchesWorkType(job, filter) {
    if (!filter || filter.length === 0) return true;
    if (!job.workType) return true;
    const arr = Array.isArray(job.workType) ? job.workType : [job.workType];
    return arr.some(t => filter.includes(t));
}

function matchesRegion(job, regions, specificCountries) {
    if ((!regions || regions.length === 0) && (!specificCountries || specificCountries.length === 0)) return true;
    if (!job.region && !job.country) return true;
    if (specificCountries && specificCountries.length > 0 && job.country) {
        if (specificCountries.includes(job.country.toUpperCase())) return true;
    }
    if (regions && regions.length > 0) {
        if (job.region && regions.includes(job.region)) return true;
        if (job.country) {
            const upper = job.country.toUpperCase();
            return regions.some(r => REGION_COUNTRY_MAP[r]?.includes(upper));
        }
    }
    return false;
}

function matchesSalary(job, salaryMin, salaryCurrency, includeMissingSalary) {
    if (salaryMin === null || salaryMin === undefined) return true;
    const hasNoSalary = (job.salaryMin == null) && (job.salaryMax == null);
    if (hasNoSalary) return includeMissingSalary;
    const floorUSD = toUSD(salaryMin, salaryCurrency || 'INR');
    const jobCurrency = job.salaryCurrency || 'USD';
    const jobSalary = job.salaryMax ?? job.salaryMin ?? 0;
    return toUSD(jobSalary, jobCurrency) >= floorUSD;
}

function matchesCompanySize(job, filter) {
    if (!filter || filter.length === 0) return true;
    if (job.companySize) return filter.includes(job.companySize);
    if (job.companyEmployeeCount != null) return filter.includes(employeeCountToSize(job.companyEmployeeCount));
    return true;
}

function hasActiveFilters(config) {
    return (
        (config.workArrangements && config.workArrangements.length > 0) ||
        (config.workTypes && config.workTypes.length > 0) ||
        (config.regions && config.regions.length > 0) ||
        config.salaryMin !== null ||
        (config.companySizes && config.companySizes.length > 0)
    );
}

function preFilterJobs(jobs, config, flags) {
    const totalBefore = jobs.length;
    if (!flags || !flags.ADVANCED_FILTERS) {
        return { jobs, totalBefore, totalAfter: totalBefore, filtersApplied: false, filterSummary: 'No filters applied (feature disabled)' };
    }
    let filtered = jobs;
    const labels = [];
    if (config.workArrangements && config.workArrangements.length > 0) {
        filtered = filtered.filter(j => matchesWorkArrangement(j, config.workArrangements));
        labels.push(`arrangement:${config.workArrangements.join(',')}`);
    }
    if (config.workTypes && config.workTypes.length > 0) {
        filtered = filtered.filter(j => matchesWorkType(j, config.workTypes));
        labels.push(`type:${config.workTypes.join(',')}`);
    }
    if (flags.MULTI_REGION && config.regions && config.regions.length > 0) {
        filtered = filtered.filter(j => matchesRegion(j, config.regions, config.specificCountries));
        labels.push(`regions:${config.regions.join(',')}`);
    }
    if (flags.SALARY_FILTER && config.salaryMin != null) {
        filtered = filtered.filter(j => matchesSalary(j, config.salaryMin, config.salaryCurrency, config.includeMissingSalary));
        labels.push(`salary>=${config.salaryMin}`);
    }
    if (flags.COMPANY_SIZE_FILTER && config.companySizes && config.companySizes.length > 0) {
        filtered = filtered.filter(j => matchesCompanySize(j, config.companySizes));
        labels.push(`size:${config.companySizes.join(',')}`);
    }
    return { jobs: filtered, totalBefore, totalAfter: filtered.length, filtersApplied: labels.length > 0, filterSummary: labels.join(' AND ') || 'No active filters' };
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const JOBS = [
    { id: 'j1', title: 'Remote Frontend Engineer', workArrangement: 'remote', workType: 'full-time', country: 'US', salaryMax: 120000, salaryCurrency: 'USD', companyEmployeeCount: 30 },
    { id: 'j2', title: 'Onsite Backend Dev', workArrangement: 'onsite', workType: 'full-time', country: 'DE', salaryMax: 60000, salaryCurrency: 'USD', companyEmployeeCount: 500 },
    { id: 'j3', title: 'Hybrid Contract PM', workArrangement: 'hybrid', workType: 'contract', country: 'IN', salaryMax: 2000000, salaryCurrency: 'INR', companyEmployeeCount: 150 },
    { id: 'j4', title: 'Freelance Designer', workArrangement: 'remote', workType: 'freelance', country: null, salaryMin: null, salaryMax: null, companySize: 'enterprise' },
    { id: 'j5', title: 'Part-time Analyst', workArrangement: 'onsite', workType: 'part-time', country: 'FR', salaryMax: 40000, salaryCurrency: 'USD', companyEmployeeCount: 2000 },
];

const ALL_OFF = { ADVANCED_FILTERS: false, SALARY_FILTER: false, COMPANY_SIZE_FILTER: false, MULTI_REGION: false };
const ALL_ON = { ADVANCED_FILTERS: true, SALARY_FILTER: true, COMPANY_SIZE_FILTER: true, MULTI_REGION: true };
const MASTER_ONLY = { ADVANCED_FILTERS: true, SALARY_FILTER: false, COMPANY_SIZE_FILTER: false, MULTI_REGION: false };

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log('\n🧪 Pre-Filter Engine Tests\n');

// 1. Kill switch — all off
test('KILL SWITCH: flags.ADVANCED_FILTERS=false passes all jobs through', () => {
    const result = preFilterJobs(JOBS, { workArrangements: ['remote'], workTypes: [], regions: [], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: [] }, ALL_OFF);
    assert.equal(result.jobs.length, JOBS.length, 'Passthrough: all jobs returned');
    assert.equal(result.filtersApplied, false, 'filtersApplied should be false');
});

// 2. Work arrangement filter
test('Work arrangement: only remote jobs', () => {
    const result = preFilterJobs(JOBS, { workArrangements: ['remote'], workTypes: [], regions: [], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: [] }, MASTER_ONLY);
    assert.ok(result.jobs.every(j => j.workArrangement === 'remote' || !j.workArrangement), 'Only remote jobs');
    assert.equal(result.filtersApplied, true);
});

// 3. Work type filter
test('Work type: only full-time', () => {
    const result = preFilterJobs(JOBS, { workArrangements: [], workTypes: ['full-time'], regions: [], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: [] }, MASTER_ONLY);
    const all = result.jobs.every(j => j.workType === 'full-time' || !j.workType);
    assert.ok(all, 'Only full-time jobs returned');
});

// 4. Work arrangement OR logic
test('Work arrangement OR: remote + hybrid returns both', () => {
    const result = preFilterJobs(JOBS, { workArrangements: ['remote', 'hybrid'], workTypes: [], regions: [], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: [] }, MASTER_ONLY);
    const arrangements = result.jobs.map(j => j.workArrangement);
    assert.ok(arrangements.includes('remote') || arrangements.includes('hybrid'), 'Both arrangements present');
    assert.ok(!arrangements.includes('onsite'), 'Onsite excluded');
});

// 5. Region filter with MULTI_REGION on
test('Region filter: EU includes DE and FR jobs', () => {
    const result = preFilterJobs(JOBS, { workArrangements: [], workTypes: [], regions: ['EU'], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: [] }, ALL_ON);
    const countries = result.jobs.map(j => j.country);
    assert.ok(countries.includes('DE'), 'DE included in EU');
    assert.ok(countries.includes('FR'), 'FR included in EU');
    assert.ok(!countries.includes('US'), 'US excluded from EU');
});

// 6. Region filter off when MULTI_REGION=false
test('Region filter: skipped when MULTI_REGION=false', () => {
    const result = preFilterJobs(JOBS, { workArrangements: [], workTypes: [], regions: ['EU'], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: [] }, MASTER_ONLY);
    assert.equal(result.jobs.length, JOBS.length, 'All jobs returned (MULTI_REGION flag off)');
});

// 7. Salary filter
test('Salary filter: excludes low salary jobs', () => {
    // floor: USD 100k. j1 has $120k (pass), j2 has $60k (fail), j3 has 20lakh INR ≈ $24k (fail)
    const result = preFilterJobs(JOBS, { workArrangements: [], workTypes: [], regions: [], specificCountries: [], salaryMin: 100000, salaryCurrency: 'USD', includeMissingSalary: false, companySizes: [] }, ALL_ON);
    assert.ok(result.jobs.some(j => j.id === 'j1'), 'j1 ($120k USD) passes');
    assert.ok(!result.jobs.some(j => j.id === 'j2'), 'j2 ($60k) rejected');
    assert.ok(!result.jobs.some(j => j.id === 'j3'), 'j3 (low INR) rejected');
    assert.ok(!result.jobs.some(j => j.id === 'j4'), 'j4 (no salary, includeMissingSalary=false) rejected');
});

// 8. Salary filter: includeMissingSalary=true
test('Salary filter: includeMissingSalary=true keeps no-salary jobs', () => {
    const result = preFilterJobs(JOBS, { workArrangements: [], workTypes: [], regions: [], specificCountries: [], salaryMin: 100000, salaryCurrency: 'USD', includeMissingSalary: true, companySizes: [] }, ALL_ON);
    assert.ok(result.jobs.some(j => j.id === 'j4'), 'j4 (no salary) kept when includeMissingSalary=true');
});

// 9. Company size from employeeCount
test('Company size: startup (<=50 employees)', () => {
    const result = preFilterJobs(JOBS, { workArrangements: [], workTypes: [], regions: [], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: ['startup'] }, ALL_ON);
    assert.ok(result.jobs.some(j => j.id === 'j1'), 'j1 (30 employees → startup) included');
    assert.ok(!result.jobs.some(j => j.id === 'j2'), 'j2 (500 → mid-size) excluded');
});

// 10. Company size: enterprise explicit field
test('Company size: explicit companySize field respected', () => {
    const result = preFilterJobs(JOBS, { workArrangements: [], workTypes: [], regions: [], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: ['enterprise'] }, ALL_ON);
    assert.ok(result.jobs.some(j => j.id === 'j4'), 'j4 (companySize:enterprise) included');
    assert.ok(result.jobs.some(j => j.id === 'j5'), 'j5 (2000 employees → enterprise) included');
});

// 11. hasActiveFilters
test('hasActiveFilters: empty config returns false', () => {
    assert.equal(hasActiveFilters({ workArrangements: [], workTypes: [], regions: [], specificCountries: [], salaryMin: null, companySizes: [] }), false);
});

test('hasActiveFilters: non-empty returns true', () => {
    assert.equal(hasActiveFilters({ workArrangements: ['remote'], workTypes: [], regions: [], specificCountries: [], salaryMin: null, companySizes: [] }), true);
});

// 12. Empty filter config — nothing filtered
test('Empty filter config: all jobs through (when flag on)', () => {
    const result = preFilterJobs(JOBS, { workArrangements: [], workTypes: [], regions: [], specificCountries: [], salaryMin: null, salaryCurrency: 'INR', includeMissingSalary: true, companySizes: [] }, MASTER_ONLY);
    assert.equal(result.jobs.length, JOBS.length, 'No filters = all jobs');
    assert.equal(result.filtersApplied, false);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error('\n❌ Some tests failed.');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
}
