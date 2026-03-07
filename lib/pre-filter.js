// =============================================================================
// MIDAS PRE-FILTER ENGINE
// =============================================================================
// Sits UPSTREAM of Panda matching. When ADVANCED_FILTERS flag is off, this
// is a pure pass-through and Panda sees the full job pool unchanged.
//
// Architecture:
//   [Job Fetcher] → preFilterJobs() → [filtered pool] → Panda matching
//
// Panda's code is NEVER modified. This is a pure upstream gate.
// =============================================================================

import { DEFAULT_FILTER_CONFIG } from './filters.js';

// ---------------------------------------------------------------------------
// Currency conversion rates (approximate, for salary floor comparison)
// In production, fetch these from an FX API and cache daily in Redis.
// ---------------------------------------------------------------------------

const SALARY_TO_USD = {
    USD: 1,
    INR: 0.012,
    EUR: 1.08,
    GBP: 1.27,
    AED: 0.27,
    SGD: 0.74,
    CAD: 0.73,
    AUD: 0.65,
};

function toUSD(amount, currency) {
    return amount * (SALARY_TO_USD[currency] || 1);
}

// ---------------------------------------------------------------------------
// Region → country code mapping
// ---------------------------------------------------------------------------

const REGION_COUNTRY_MAP = {
    IN: ['IN'],
    US: ['US'],
    UK: ['GB', 'UK'],
    EU: ['DE', 'FR', 'NL', 'ES', 'IT', 'SE', 'PL', 'IE', 'PT', 'BE', 'AT', 'DK', 'FI', 'CZ', 'RO', 'NO', 'CH'],
    MENA: ['AE', 'SA', 'QA', 'BH', 'KW', 'OM', 'EG', 'JO', 'LB', 'MA', 'TN'],
    SEA: ['SG', 'MY', 'ID', 'TH', 'PH', 'VN'],
    CA: ['CA'],
    AU: ['AU', 'NZ'],
    LATAM: ['BR', 'MX', 'AR', 'CL', 'CO', 'PE'],
    AF: ['ZA', 'NG', 'KE', 'GH', 'RW', 'ET'],
};

// ---------------------------------------------------------------------------
// Employee count → company size bucket
// ---------------------------------------------------------------------------

function employeeCountToSize(count) {
    if (count <= 50) return 'startup';
    if (count <= 200) return 'scaleup';
    if (count <= 1000) return 'mid-size';
    return 'enterprise';
}

// ---------------------------------------------------------------------------
// Individual filter predicates
// Each returns true = "keep this job"
// ---------------------------------------------------------------------------

function matchesWorkArrangement(job, filter) {
    if (!filter || filter.length === 0) return true; // no filter = match all
    if (!job.workArrangement) return true; // missing data = don't exclude

    const jobArrangements = Array.isArray(job.workArrangement)
        ? job.workArrangement
        : [job.workArrangement];

    return jobArrangements.some(a => filter.includes(a));
}

function matchesWorkType(job, filter) {
    if (!filter || filter.length === 0) return true;
    if (!job.workType) return true;

    const jobTypes = Array.isArray(job.workType)
        ? job.workType
        : [job.workType];

    return jobTypes.some(t => filter.includes(t));
}

function matchesRegion(job, regions, specificCountries) {
    if ((!regions || regions.length === 0) && (!specificCountries || specificCountries.length === 0)) return true;
    if (!job.region && !job.country) return true; // missing data = don't exclude

    // Specific countries take priority
    if (specificCountries && specificCountries.length > 0 && job.country) {
        if (specificCountries.includes(job.country.toUpperCase())) return true;
    }

    // Region membership check
    if (regions && regions.length > 0) {
        if (job.region && regions.includes(job.region)) return true;

        if (job.country) {
            const upperCountry = job.country.toUpperCase();
            return regions.some(region => REGION_COUNTRY_MAP[region]?.includes(upperCountry));
        }
    }

    return regions.length === 0; // only specificCountries were set and didn't match
}

function matchesSalary(job, salaryMin, salaryCurrency, includeMissingSalary) {
    if (salaryMin === null || salaryMin === undefined) return true; // no floor set

    // Job has no salary data
    const hasNoSalaryData =
        (job.salaryMin === null || job.salaryMin === undefined) &&
        (job.salaryMax === null || job.salaryMax === undefined);

    if (hasNoSalaryData) return includeMissingSalary;

    // Convert both to USD for comparison
    const filterFloorUSD = toUSD(salaryMin, salaryCurrency || 'INR');
    const jobCurrency = job.salaryCurrency || 'USD';

    // Use job's max salary (most generous interpretation), fallback to min
    const jobSalary = job.salaryMax ?? job.salaryMin ?? 0;
    const jobSalaryUSD = toUSD(jobSalary, jobCurrency);

    return jobSalaryUSD >= filterFloorUSD;
}

function matchesCompanySize(job, filter) {
    if (!filter || filter.length === 0) return true;

    // Direct size field
    if (job.companySize) {
        return filter.includes(job.companySize);
    }

    // Derive from employee count
    if (job.companyEmployeeCount !== null && job.companyEmployeeCount !== undefined) {
        return filter.includes(employeeCountToSize(job.companyEmployeeCount));
    }

    return true; // missing data = don't exclude
}

// ---------------------------------------------------------------------------
// Validate and sanitise a raw filter config object from a request body
// ---------------------------------------------------------------------------

export function validateFilters(raw) {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_FILTER_CONFIG };

    return {
        workArrangements: Array.isArray(raw.workArrangements) ? raw.workArrangements : [],
        workTypes: Array.isArray(raw.workTypes) ? raw.workTypes : [],
        regions: Array.isArray(raw.regions) ? raw.regions : [],
        specificCountries: Array.isArray(raw.specificCountries) ? raw.specificCountries : [],
        salaryMin: typeof raw.salaryMin === 'number' && raw.salaryMin > 0 ? raw.salaryMin : null,
        salaryCurrency: raw.salaryCurrency || 'INR',
        includeMissingSalary: raw.includeMissingSalary !== false, // default true
        companySizes: Array.isArray(raw.companySizes) ? raw.companySizes : [],
    };
}

// ---------------------------------------------------------------------------
// Main pre-filter function
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PreFilterResult
 * @property {Object[]} jobs - Filtered job array
 * @property {number} totalBefore - Job count before filtering
 * @property {number} totalAfter - Job count after filtering
 * @property {boolean} filtersApplied - Whether any filter was active
 * @property {string} filterSummary - Human-readable summary
 */

/**
 * Pre-filter jobs upstream of Panda matching.
 * @param {Object[]} jobs - Raw job pool
 * @param {Object} config - FilterConfig from the user
 * @param {Object} flags - FeatureFlags from server
 * @returns {PreFilterResult}
 */
export function preFilterJobs(jobs, config, flags) {
    const totalBefore = jobs.length;

    // =========================================================================
    // KILL SWITCH: If advanced filters are off, pass everything through.
    // This is the safe revert path — zero impact on Panda.
    // =========================================================================
    if (!flags || !flags.ADVANCED_FILTERS) {
        return {
            jobs,
            totalBefore,
            totalAfter: totalBefore,
            filtersApplied: false,
            filterSummary: 'No filters applied (feature disabled)',
        };
    }

    // =========================================================================
    // Apply filters in sequence. Each is gated by its own sub-flag.
    // =========================================================================

    let filtered = jobs;
    const appliedLabels = [];

    // --- Work Arrangement (on when ADVANCED_FILTERS is on) ---
    if (config.workArrangements && config.workArrangements.length > 0) {
        filtered = filtered.filter(j => matchesWorkArrangement(j, config.workArrangements));
        appliedLabels.push(`arrangement:${config.workArrangements.join(',')}`);
    }

    // --- Work Type (on when ADVANCED_FILTERS is on) ---
    if (config.workTypes && config.workTypes.length > 0) {
        filtered = filtered.filter(j => matchesWorkType(j, config.workTypes));
        appliedLabels.push(`type:${config.workTypes.join(',')}`);
    }

    // --- Region / Location (gated by MULTI_REGION sub-flag) ---
    if (flags.MULTI_REGION) {
        if ((config.regions && config.regions.length > 0) || (config.specificCountries && config.specificCountries.length > 0)) {
            filtered = filtered.filter(j => matchesRegion(j, config.regions, config.specificCountries));
            appliedLabels.push(`regions:${config.regions.join(',')}`);
        }
    }

    // --- Salary (gated by SALARY_FILTER sub-flag) ---
    if (flags.SALARY_FILTER && config.salaryMin !== null && config.salaryMin !== undefined) {
        filtered = filtered.filter(j =>
            matchesSalary(j, config.salaryMin, config.salaryCurrency, config.includeMissingSalary)
        );
        appliedLabels.push(`salary>=${config.salaryMin} ${config.salaryCurrency}`);
    }

    // --- Company Size (gated by COMPANY_SIZE_FILTER sub-flag) ---
    if (flags.COMPANY_SIZE_FILTER && config.companySizes && config.companySizes.length > 0) {
        filtered = filtered.filter(j => matchesCompanySize(j, config.companySizes));
        appliedLabels.push(`size:${config.companySizes.join(',')}`);
    }

    return {
        jobs: filtered,
        totalBefore,
        totalAfter: filtered.length,
        filtersApplied: appliedLabels.length > 0,
        filterSummary: appliedLabels.length > 0
            ? `Filters: ${appliedLabels.join(' AND ')}`
            : 'No active filters',
    };
}

// ---------------------------------------------------------------------------
// Utility: Check if a filter config has any active filters (for UI badge)
// ---------------------------------------------------------------------------

export function hasActiveFilters(config) {
    return (
        (config.workArrangements && config.workArrangements.length > 0) ||
        (config.workTypes && config.workTypes.length > 0) ||
        (config.regions && config.regions.length > 0) ||
        (config.specificCountries && config.specificCountries.length > 0) ||
        config.salaryMin !== null ||
        (config.companySizes && config.companySizes.length > 0)
    );
}

// ---------------------------------------------------------------------------
// Utility: Human-readable filter summary for the UI
// ---------------------------------------------------------------------------

export function humanFilterSummary(config) {
    const parts = [];

    if (config.workArrangements && config.workArrangements.length > 0) {
        parts.push(config.workArrangements.join(', '));
    }
    if (config.workTypes && config.workTypes.length > 0) {
        parts.push(config.workTypes.join(', '));
    }
    if (config.regions && config.regions.length > 0) {
        parts.push(config.regions.join(', '));
    }
    if (config.salaryMin !== null && config.salaryMin !== undefined) {
        parts.push(`${config.salaryCurrency} ${config.salaryMin.toLocaleString()}+`);
    }
    if (config.companySizes && config.companySizes.length > 0) {
        parts.push(config.companySizes.join(', '));
    }

    return parts.length > 0 ? parts.join(' · ') : 'All jobs';
}
