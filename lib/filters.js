// =============================================================================
// MIDAS FILTER SYSTEM — Constants & Defaults
// =============================================================================
// Design principles:
//   1. Every filter field is OPTIONAL — empty = "match all"
//   2. Arrays use OR logic within a field (e.g. ["remote", "hybrid"])
//   3. Fields use AND logic between them (remote AND full-time AND salary >= X)
//   4. Panda never sees these — they resolve before matching
// =============================================================================

// ---------------------------------------------------------------------------
// Enum-like constant arrays
// ---------------------------------------------------------------------------

export const WORK_ARRANGEMENTS = ['onsite', 'hybrid', 'remote', 'distributed'];

export const WORK_TYPES = ['full-time', 'contract', 'part-time', 'internship', 'freelance'];

export const REGIONS = ['IN', 'US', 'UK', 'EU', 'MENA', 'SEA', 'CA', 'AU', 'LATAM', 'AF'];

export const COMPANY_SIZES = ['startup', 'scaleup', 'mid-size', 'enterprise'];

export const SALARY_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'AUD'];

// ---------------------------------------------------------------------------
// Default filter state — everything open, nothing restricted
// ---------------------------------------------------------------------------

/** @type {import('./pre-filter').FilterConfig} */
export const DEFAULT_FILTER_CONFIG = {
    workArrangements: [],
    workTypes: [],
    regions: [],
    specificCountries: [],
    salaryMin: null,
    salaryCurrency: 'INR',
    includeMissingSalary: true,
    companySizes: [],
};

// ---------------------------------------------------------------------------
// Feature flags — all false by default (master kill switch)
// ---------------------------------------------------------------------------

export const DEFAULT_FEATURE_FLAGS = {
    ADVANCED_FILTERS: false,    // Master kill switch
    SALARY_FILTER: false,        // Salary filter specifically
    COMPANY_SIZE_FILTER: false,  // Company size filter
    MULTI_REGION: false,         // Multi-region vs single country
};

// ---------------------------------------------------------------------------
// Display metadata — for rendering labels and descriptions in the UI
// ---------------------------------------------------------------------------

/** @type {Record<string, {value: string, label: string, description?: string}>} */
export const WORK_ARRANGEMENT_META = {
    onsite: { value: 'onsite', label: 'On-site', description: 'Work from office daily' },
    hybrid: { value: 'hybrid', label: 'Hybrid', description: 'Mix of office & remote' },
    remote: { value: 'remote', label: 'Remote', description: 'Work from anywhere in-region' },
    distributed: { value: 'distributed', label: 'Distributed', description: 'Fully distributed team, no HQ' },
};

export const WORK_TYPE_META = {
    'full-time': { value: 'full-time', label: 'Full-time' },
    'contract': { value: 'contract', label: 'Contract' },
    'part-time': { value: 'part-time', label: 'Part-time' },
    'internship': { value: 'internship', label: 'Internship' },
    'freelance': { value: 'freelance', label: 'Freelance' },
};

export const REGION_META = {
    IN: { value: 'IN', label: 'India' },
    US: { value: 'US', label: 'United States' },
    UK: { value: 'UK', label: 'United Kingdom' },
    EU: { value: 'EU', label: 'Europe' },
    MENA: { value: 'MENA', label: 'Middle East' },
    SEA: { value: 'SEA', label: 'Southeast Asia' },
    CA: { value: 'CA', label: 'Canada' },
    AU: { value: 'AU', label: 'ANZ' },
    LATAM: { value: 'LATAM', label: 'Latin America' },
    AF: { value: 'AF', label: 'Africa' },
};

export const COMPANY_SIZE_META = {
    startup: { value: 'startup', label: 'Startup', description: '1–50 employees' },
    scaleup: { value: 'scaleup', label: 'Scale-up', description: '51–200 employees' },
    'mid-size': { value: 'mid-size', label: 'Mid-size', description: '201–1000 employees' },
    enterprise: { value: 'enterprise', label: 'Enterprise', description: '1000+ employees' },
};
