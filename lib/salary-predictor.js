/**
 * salary-predictor.js
 * Midas Match — Salary Prediction Engine
 *
 * Estimates salary ranges from job description text when salary isn't posted.
 * Rule-based approach using market data tiers. No external dependencies.
 *
 * Usage:
 *   import { predictSalary } from './salary-predictor.js';
 *   const result = predictSalary(job);
 */

// ---------------------------------------------------------------------------
// SENIORITY DETECTION
// ---------------------------------------------------------------------------

const SENIORITY_LEVELS = ['intern', 'junior', 'mid', 'senior', 'lead', 'executive'];

/**
 * Pattern maps are ordered from most-specific to least-specific.
 * Each entry: [regex, seniority_level]
 */
const SENIORITY_PATTERNS = [
  // Executive / C-suite
  [/\b(ceo|cto|coo|cpo|ciso|chief\s+\w+\s+officer|co-?founder|founder)\b/i, 'executive'],
  [/\b(vp|vice\s+president)\b/i, 'executive'],

  // Lead / Principal / Director / Head
  [/\b(principal|director|head\s+of|engineering\s+manager|group\s+lead|staff\s+engineer)\b/i, 'lead'],

  // Senior / Staff
  [/\b(senior|sr\.?|staff)\b/i, 'senior'],

  // Junior / Entry / Associate / Graduate
  [/\b(junior|jr\.?|entry[- ]level|associate|graduate|grad\s+hire|new\s+grad)\b/i, 'junior'],

  // Intern / Fresher / Trainee
  [/\b(intern|internship|fresher|trainee|apprentice)\b/i, 'intern'],
];

/**
 * Detects seniority from job title and description text.
 * Returns the seniority string and a boolean indicating whether it was
 * explicitly found (vs. defaulting to 'mid').
 */
function detectSeniority(title, summary) {
  const searchText = `${title} ${summary}`.toLowerCase();

  for (const [pattern, level] of SENIORITY_PATTERNS) {
    if (pattern.test(searchText)) {
      return { seniority: level, explicit: true };
    }
  }

  // No qualifier found — assume mid-level
  return { seniority: 'mid', explicit: false };
}

// ---------------------------------------------------------------------------
// ROLE CATEGORY DETECTION
// ---------------------------------------------------------------------------

/**
 * Maps keyword patterns to role categories.
 * Ordered from most-specific to most-generic.
 */
const ROLE_CATEGORY_PATTERNS = [
  // Healthcare
  [/\b(nurse|doctor|physician|surgeon|pharmacist|therapist|radiolog|dentist|medical|clinical|healthcare|health\s+care|caregiving|paramedic|emt)\b/i, 'healthcare'],

  // Legal
  [/\b(lawyer|attorney|counsel|legal|paralegal|compliance\s+officer|contract\s+manager|litigation)\b/i, 'legal'],

  // Finance
  [/\b(accountant|accounting|finance|financial\s+(analyst|planner|advisor)|cfo|controller|audit|actuar|tax|treasury|investment\s+banker|quant)\b/i, 'finance'],

  // Data / ML / AI
  [/\b(data\s+(scientist|engineer|analyst|architect)|machine\s+learning|ml\s+engineer|ai\s+engineer|deep\s+learning|nlp|llm|computer\s+vision|analytics\s+engineer|bi\s+developer|business\s+intelligence)\b/i, 'data'],

  // Engineering (Software / Hardware / Infra)
  [/\b(software\s+(engineer|developer|architect)|frontend|back[- ]?end|full[- ]?stack|devops|sre|site\s+reliability|platform\s+engineer|mobile\s+developer|ios|android|react|angular|vue|node|java|python|golang|rust|c\+\+|firmware|embedded|qa\s+engineer|test\s+engineer|cloud\s+engineer|infrastructure\s+engineer)\b/i, 'engineering'],

  // Design / UX / Creative
  [/\b(designer|ux|ui|user\s+experience|user\s+interface|graphic\s+design|visual\s+design|product\s+design|motion\s+design|brand\s+design|illustrat|creative\s+director)\b/i, 'design'],

  // Product Management
  [/\b(product\s+manager|product\s+owner|program\s+manager|scrum\s+master|agile\s+coach|technical\s+product\s+manager|growth\s+product)\b/i, 'product'],

  // Marketing / Growth / Content
  [/\b(marketing|growth\s+hacker|seo|sem|ppc|content\s+(writer|strategist|marketer)|copywriter|brand\s+manager|demand\s+generation|performance\s+marketing|social\s+media|influencer|pr\s+manager|public\s+relations|email\s+marketing|digital\s+marketing)\b/i, 'marketing'],

  // Sales / Business Development
  [/\b(sales|account\s+(executive|manager|director)|business\s+development|bdr|sdr|ae\b|revenue\s+manager|deal\s+closer|enterprise\s+sales|pre-?sales|solutions\s+engineer)\b/i, 'sales'],

  // HR / People / Recruiting
  [/\b(recruiter|talent\s+acquisition|hr\s|human\s+resources|people\s+(ops|operations|partner)|hrbp|training\s+&?\s+development|compensation\s+&?\s+benefits|payroll)\b/i, 'hr'],

  // Operations / Supply Chain / Logistics
  [/\b(operations|supply\s+chain|logistics|warehouse|procurement|vendor\s+management|project\s+manager|program\s+manager|operations\s+manager|scm|erp)\b/i, 'operations'],

  // CX / Support
  [/\b(customer\s+(success|support|service)|client\s+success|technical\s+support|helpdesk|help\s+desk|tier\s+[12]|support\s+specialist|customer\s+experience)\b/i, 'cx_support'],

  // Construction / Trades / Civil
  [/\b(civil\s+engineer|structural\s+engineer|architect\s+(?!ure)|construction|contractor|electrician|plumber|carpenter|site\s+manager|quantity\s+surveyor|mep)\b/i, 'construction'],
];

/**
 * Detects role category from job title and description text.
 * Returns the category string and explicit boolean.
 */
function detectRoleCategory(title, summary) {
  const searchText = `${title} ${summary}`;

  // Title gets priority — check title-only first
  for (const [pattern, category] of ROLE_CATEGORY_PATTERNS) {
    if (pattern.test(title)) {
      return { roleCategory: category, explicit: true };
    }
  }

  // Fall back to full text
  for (const [pattern, category] of ROLE_CATEGORY_PATTERNS) {
    if (pattern.test(searchText)) {
      return { roleCategory: category, explicit: false };
    }
  }

  return { roleCategory: 'other', explicit: false };
}

// ---------------------------------------------------------------------------
// LOCATION TIER DETECTION
// ---------------------------------------------------------------------------

/**
 * Location tier and multiplier data.
 * Each entry: { pattern, tier, multiplier, currency }
 * Ordered from most-specific to most-generic.
 */
const LOCATION_DATA = [
  // Tier 1 — San Francisco / Bay Area
  { pattern: /\b(san\s+francisco|sf\b|silicon\s+valley|palo\s+alto|menlo\s+park|mountain\s+view|sunnyvale|san\s+jose)\b/i, tier: 'tier1', multiplier: 1.0,  currency: 'USD' },

  // Tier 1 — New York
  { pattern: /\b(new\s+york|nyc\b|brooklyn|manhattan|queens)\b/i,                                                          tier: 'tier1', multiplier: 1.0,  currency: 'USD' },

  // Tier 1 — Seattle
  { pattern: /\b(seattle|bellevue|redmond)\b/i,                                                                             tier: 'tier1', multiplier: 0.95, currency: 'USD' },

  // Tier 1 — Boston
  { pattern: /\b(boston|cambridge,?\s*ma)\b/i,                                                                              tier: 'tier1', multiplier: 0.95, currency: 'USD' },

  // Tier 1 — London
  { pattern: /\b(london|london,?\s*uk)\b/i,                                                                                 tier: 'tier1', multiplier: 0.85, currency: 'GBP' },

  // Tier 1 — Zurich
  { pattern: /\b(zurich|z[üu]rich|geneva)\b/i,                                                                              tier: 'tier1', multiplier: 0.90, currency: 'CHF' },

  // Tier 1 — Singapore
  { pattern: /\b(singapore)\b/i,                                                                                             tier: 'tier1', multiplier: 0.90, currency: 'SGD' },

  // Tier 2 — Austin
  { pattern: /\b(austin,?\s*tx)\b/i,                                                                                        tier: 'tier2', multiplier: 0.85, currency: 'USD' },

  // Tier 2 — Denver
  { pattern: /\b(denver|boulder,?\s*co)\b/i,                                                                                tier: 'tier2', multiplier: 0.85, currency: 'USD' },

  // Tier 2 — Chicago
  { pattern: /\b(chicago)\b/i,                                                                                               tier: 'tier2', multiplier: 0.85, currency: 'USD' },

  // Tier 2 — Toronto
  { pattern: /\b(toronto|vancouver,?\s*bc|montreal)\b/i,                                                                    tier: 'tier2', multiplier: 0.80, currency: 'CAD' },

  // Tier 2 — Berlin
  { pattern: /\b(berlin|munich|hamburg|frankfurt|d[üu]sseldorf)\b/i,                                                        tier: 'tier2', multiplier: 0.75, currency: 'EUR' },

  // Tier 2 — Amsterdam
  { pattern: /\b(amsterdam|rotterdam|utrecht)\b/i,                                                                          tier: 'tier2', multiplier: 0.75, currency: 'EUR' },

  // Tier 2 — Sydney
  { pattern: /\b(sydney|melbourne|brisbane|perth,?\s*au)\b/i,                                                               tier: 'tier2', multiplier: 0.80, currency: 'AUD' },

  // Tier 2 — Dublin
  { pattern: /\b(dublin,?\s*ireland)\b/i,                                                                                   tier: 'tier2', multiplier: 0.75, currency: 'EUR' },

  // Tier 2 — Bengaluru (India — separate handling for INR)
  { pattern: /\b(bengaluru|bangalore)\b/i,                                                                                   tier: 'tier2', multiplier: 0.30, currency: 'INR' },

  // Tier 2 — Hyderabad (India)
  { pattern: /\b(hyderabad)\b/i,                                                                                             tier: 'tier2', multiplier: 0.30, currency: 'INR' },

  // Tier 2 — Mumbai
  { pattern: /\b(mumbai|bombay)\b/i,                                                                                        tier: 'tier2', multiplier: 0.28, currency: 'INR' },

  // Tier 2 — Delhi / NCR / Pune (India)
  { pattern: /\b(delhi|new\s+delhi|ncr|gurugram|gurgaon|noida|pune)\b/i,                                                    tier: 'tier2', multiplier: 0.28, currency: 'INR' },

  // Other India cities
  { pattern: /\b(india|chennai|kolkata|ahmedabad|jaipur|coimbatore|kochi|trivandrum)\b/i,                                   tier: 'tier3', multiplier: 0.25, currency: 'INR' },

  // UAE / Dubai
  { pattern: /\b(dubai|abu\s+dhabi|uae|sharjah)\b/i,                                                                       tier: 'tier2', multiplier: 0.75, currency: 'AED' },

  // Other EU cities
  { pattern: /\b(paris|barcelona|madrid|milan|rome|stockholm|oslo|copenhagen|helsinki|lisbon|warsaw|prague|vienna|budapest|brussels|antwerp)\b/i, tier: 'tier3', multiplier: 0.70, currency: 'EUR' },

  // Other UK cities
  { pattern: /\b(manchester|birmingham|bristol|leeds|glasgow|edinburgh|sheffield|uk\b|united\s+kingdom|england|scotland|wales)\b/i, tier: 'tier3', multiplier: 0.70, currency: 'GBP' },

  // Canada general
  { pattern: /\b(canada|ottawa|calgary|edmonton)\b/i,                                                                       tier: 'tier3', multiplier: 0.72, currency: 'CAD' },

  // Remote
  { pattern: /\b(remote|work\s+from\s+home|wfh|distributed\s+team|anywhere)\b/i,                                           tier: 'remote', multiplier: 0.85, currency: 'USD' },
];

/**
 * Detects location tier, multiplier, and local currency from location string
 * and job summary.
 * Returns { tier, multiplier, currency, locationLabel, explicit }
 */
function detectLocation(location, summary) {
  const searchText = `${location || ''} ${summary || ''}`;

  for (const entry of LOCATION_DATA) {
    if (entry.pattern.test(searchText)) {
      // Extract the matched location label for the basis string
      const match = searchText.match(entry.pattern);
      return {
        tier: entry.tier,
        multiplier: entry.multiplier,
        currency: entry.currency,
        locationLabel: match ? toTitleCase(match[0].trim()) : (location || 'Unknown'),
        explicit: !!location && entry.pattern.test(location),
      };
    }
  }

  // Unknown location
  return {
    tier: 'tier3',
    multiplier: 0.75,
    currency: 'USD',
    locationLabel: location || 'Unknown',
    explicit: false,
  };
}

// ---------------------------------------------------------------------------
// SALARY BASE TABLES (USD, Tier 1 equivalent)
// ---------------------------------------------------------------------------

/**
 * Base salary ranges in USD at Tier 1 (SF/NYC).
 * Structure: { roleCategory: { seniority: [min, max] } }
 * All figures are annual in thousands of USD.
 */
const BASE_SALARY_TABLE = {
  engineering: {
    intern:    [60_000,  80_000],
    junior:    [80_000,  110_000],
    mid:       [110_000, 150_000],
    senior:    [150_000, 200_000],
    lead:      [200_000, 280_000],
    executive: [280_000, 400_000],
  },
  data: {
    intern:    [65_000,  85_000],
    junior:    [85_000,  120_000],
    mid:       [120_000, 165_000],
    senior:    [165_000, 220_000],
    lead:      [220_000, 300_000],
    executive: [280_000, 400_000],
  },
  design: {
    intern:    [50_000,  70_000],
    junior:    [70_000,  100_000],
    mid:       [100_000, 140_000],
    senior:    [140_000, 190_000],
    lead:      [190_000, 250_000],
    executive: [250_000, 350_000],
  },
  product: {
    intern:    [60_000,  80_000],
    junior:    [85_000,  115_000],
    mid:       [115_000, 155_000],
    senior:    [155_000, 210_000],
    lead:      [210_000, 300_000],
    executive: [280_000, 400_000],
  },
  marketing: {
    intern:    [40_000,  55_000],
    junior:    [55_000,  80_000],
    mid:       [80_000,  120_000],
    senior:    [120_000, 170_000],
    lead:      [170_000, 240_000],
    executive: [240_000, 350_000],
  },
  sales: {
    intern:    [40_000,  55_000],
    junior:    [50_000,  75_000],
    mid:       [75_000,  110_000],
    senior:    [110_000, 160_000],
    lead:      [160_000, 250_000],
    executive: [250_000, 380_000],
  },
  cx_support: {
    intern:    [35_000,  45_000],
    junior:    [45_000,  60_000],
    mid:       [60_000,  85_000],
    senior:    [85_000,  120_000],
    lead:      [120_000, 170_000],
    executive: [170_000, 250_000],
  },
  finance: {
    intern:    [50_000,  70_000],
    junior:    [70_000,  95_000],
    mid:       [95_000,  135_000],
    senior:    [135_000, 190_000],
    lead:      [190_000, 280_000],
    executive: [280_000, 420_000],
  },
  healthcare: {
    intern:    [40_000,  55_000],
    junior:    [55_000,  75_000],
    mid:       [75_000,  110_000],
    senior:    [110_000, 160_000],
    lead:      [160_000, 230_000],
    executive: [230_000, 350_000],
  },
  // hr, operations, legal, construction, other — use cx_support as baseline
  hr:          null,
  operations:  null,
  legal:       null,
  construction: null,
  other:       null,
};

// Fallback categories that reuse cx_support ranges
const FALLBACK_CATEGORY = 'cx_support';

/**
 * Looks up the base salary range [min, max] in USD for a given category and seniority.
 */
function getBaseSalary(roleCategory, seniority) {
  const table = BASE_SALARY_TABLE[roleCategory] || BASE_SALARY_TABLE[FALLBACK_CATEGORY];
  // If null (fallback categories), use cx_support
  const resolved = table ?? BASE_SALARY_TABLE[FALLBACK_CATEGORY];
  // If seniority not found (shouldn't happen), default to mid
  return resolved[seniority] ?? resolved['mid'];
}

// ---------------------------------------------------------------------------
// SKILL PREMIUM DETECTION
// ---------------------------------------------------------------------------

/**
 * Maps skill patterns to percentage premium (as a decimal, e.g. 0.15 = +15%).
 * Premiums are additive (stacked, not compounded).
 */
const SKILL_PREMIUMS = [
  { pattern: /\b(llm|large\s+language\s+model|generative\s+ai|genai|machine\s+learning|deep\s+learning|ai\/ml|nlp|transformer|gpt|fine[- ]?tun|rag\b|retrieval[- ]augmented)\b/i, skill: 'AI/ML/LLM', premium: 0.15 },
  { pattern: /\b(terraform|infrastructure\s+as\s+code|iac|cloud\s+architect|solutions\s+architect|aws|gcp|google\s+cloud|azure)\b/i,                                             skill: 'Cloud Architecture', premium: 0.10 },
  { pattern: /\b(security|cybersecurit|soc\s+2|iso\s+27001|penetration\s+test|pentest|cissp|cism|compliance\s+engineer|infosec|devsecops)\b/i,                                  skill: 'Security/Compliance', premium: 0.10 },
  { pattern: /\b(blockchain|web3|smart\s+contract|solidity|defi|nft|crypto|dao\b)\b/i,                                                                                         skill: 'Blockchain/Web3', premium: 0.10 },
  { pattern: /\b(salesforce|sap\s+[a-z]{2,}|workday|servicenow|oracle\s+(cloud|erp|hcm))\b/i,                                                                                  skill: 'Niche Platforms (Salesforce/SAP)', premium: 0.08 },
  { pattern: /\b(manage\s+a\s+team|people\s+management|team\s+lead|manage\s+engineers|hiring\s+plan|direct\s+reports|manage\s+\d+)\b/i,                                         skill: 'People Management', premium: 0.10 },
];

/**
 * Detects high-value skills in the job text and returns matching skill names
 * along with the total premium multiplier.
 */
function detectSkillPremiums(summary, title) {
  const text = `${title} ${summary}`;
  let totalPremium = 0;
  const detectedSkills = [];

  for (const { pattern, skill, premium } of SKILL_PREMIUMS) {
    if (pattern.test(text)) {
      detectedSkills.push(skill);
      totalPremium += premium;
    }
  }

  // Cap total premium at 40% to avoid unrealistic estimates
  return { skills: detectedSkills, totalPremium: Math.min(totalPremium, 0.40) };
}

// ---------------------------------------------------------------------------
// CURRENCY CONVERSION & FORMATTING
// ---------------------------------------------------------------------------

/**
 * USD-to-local-currency conversion rates (approximate, at time of authoring).
 * The location multiplier already scales the salary down to USD equivalent,
 * so these are purely for presentation.
 */
const CURRENCY_RATES = {
  USD: 1.00,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.55,
  SGD: 1.35,
  CAD: 1.37,
  AED: 3.67,
  CHF: 0.90,
  INR: 83.00,
};

/**
 * Converts a USD value to the target currency.
 */
function convertCurrency(usdAmount, currency) {
  const rate = CURRENCY_RATES[currency] ?? 1.0;
  return Math.round(usdAmount * rate);
}

// ---------------------------------------------------------------------------
// EXISTING SALARY PARSING
// ---------------------------------------------------------------------------

/**
 * Attempts to parse an existing salary string into { min, max, currency }.
 * Handles formats like:
 *   "$120k-$180k", "120,000 - 180,000", "₹15L-25L", "£60k-80k",
 *   "AED 15,000-25,000/month", "€70,000", "85000", "INR 1200000"
 *
 * Returns null if unparseable.
 */
function parseSalaryString(salaryStr) {
  if (!salaryStr || typeof salaryStr !== 'string') return null;

  const s = salaryStr.trim();

  // --- Detect currency symbol or code ---
  let currency = 'USD';
  if (/₹|INR/i.test(s))       currency = 'INR';
  else if (/£|GBP/i.test(s))  currency = 'GBP';
  else if (/€|EUR/i.test(s))  currency = 'EUR';
  else if (/A\$|AUD/i.test(s)) currency = 'AUD';
  else if (/S\$|SGD/i.test(s)) currency = 'SGD';
  else if (/CA\$|CAD/i.test(s)) currency = 'CAD';
  else if (/AED/i.test(s))    currency = 'AED';
  else if (/CHF/i.test(s))    currency = 'CHF';
  else if (/\$/i.test(s))     currency = 'USD';

  // --- Detect per-month and annualize ---
  const isMonthly = /\/mo(nth)?|per\s+month|p\.?m\b/i.test(s);

  // --- Strip non-numeric characters except dots, commas, L (lakh), K/k ---
  // Extract all number-like tokens
  const numTokens = [];
  // Match patterns like: 15L, 25L, 120k, 120K, 1,20,000, 120000, 1.2
  const numPattern = /(\d[\d,.]*)\s*([LlKk]?)/g;
  let match;
  while ((match = numPattern.exec(s)) !== null) {
    const raw = match[1].replace(/,/g, '');
    const suffix = match[2].toLowerCase();
    let value = parseFloat(raw);
    if (isNaN(value)) continue;

    if (suffix === 'l') value *= 100_000;        // Lakh (Indian system)
    else if (suffix === 'k') value *= 1_000;     // Thousands

    numTokens.push(value);
  }

  if (numTokens.length === 0) return null;

  let min, max;
  if (numTokens.length === 1) {
    // Single figure — treat as midpoint, ±15%
    const mid = numTokens[0];
    min = Math.round(mid * 0.85);
    max = Math.round(mid * 1.15);
  } else {
    // Take the first two as min/max (additional tokens ignored)
    [min, max] = [Math.min(...numTokens.slice(0, 2)), Math.max(...numTokens.slice(0, 2))];
  }

  // Annualize monthly figures
  if (isMonthly) {
    min *= 12;
    max *= 12;
  }

  // Sanity check: if min > max, swap
  if (min > max) [min, max] = [max, min];

  return { min, max, currency };
}

// ---------------------------------------------------------------------------
// CONFIDENCE SCORING
// ---------------------------------------------------------------------------

/**
 * Returns 'high' | 'medium' | 'low' based on how many of the three
 * key factors were explicitly detected.
 */
function computeConfidence(seniorityExplicit, roleExplicit, locationExplicit) {
  const score = [seniorityExplicit, roleExplicit, locationExplicit].filter(Boolean).length;
  if (score === 3) return 'high';
  if (score === 2) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------

function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function roundToNearest(value, nearest = 1000) {
  return Math.round(value / nearest) * nearest;
}

// ---------------------------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------------------------

/**
 * Predicts or extracts the salary range for a job listing.
 *
 * @param {Object} job
 * @param {string}  job.title       - Job title
 * @param {string}  job.summary     - Full job description text
 * @param {string}  [job.company]   - Company name (currently informational)
 * @param {string}  [job.location]  - Location string
 * @param {number}  [job.salary_min] - Pre-parsed salary min (returned as-is)
 * @param {number}  [job.salary_max] - Pre-parsed salary max (returned as-is)
 * @param {string}  [job.salary]    - Raw salary string to parse
 *
 * @returns {{
 *   estimated: boolean,
 *   currency: string,
 *   min: number,
 *   max: number,
 *   median: number,
 *   confidence: string,
 *   basis: string,
 *   factors: {
 *     seniority: string,
 *     roleCategory: string,
 *     location: string,
 *     locationTier: string,
 *     skills: string[],
 *   }
 * }}
 */
export function predictSalary(job) {
  const title   = (job.title   ?? '').trim();
  const summary = (job.summary ?? '').trim();
  const location = (job.location ?? '').trim();

  // ------------------------------------------------------------------
  // CASE 1: Structured salary already on the job object
  // ------------------------------------------------------------------
  if (typeof job.salary_min === 'number' && typeof job.salary_max === 'number') {
    const min    = job.salary_min;
    const max    = job.salary_max;
    const median = Math.round((min + max) / 2);

    // Still run factor detection for context
    const { seniority }    = detectSeniority(title, summary);
    const { roleCategory } = detectRoleCategory(title, summary);
    const loc              = detectLocation(location, summary);
    const { skills }       = detectSkillPremiums(summary, title);

    return {
      estimated: false,
      currency:  loc.currency,
      min,
      max,
      median,
      confidence: 'high',
      basis: `Salary provided directly in the listing.`,
      factors: {
        seniority,
        roleCategory,
        location: loc.locationLabel,
        locationTier: loc.tier,
        skills,
      },
    };
  }

  // ------------------------------------------------------------------
  // CASE 2: Raw salary string on the job object
  // ------------------------------------------------------------------
  if (job.salary && typeof job.salary === 'string') {
    const parsed = parseSalaryString(job.salary);
    if (parsed) {
      const { min, max, currency } = parsed;
      const median = Math.round((min + max) / 2);

      const { seniority }    = detectSeniority(title, summary);
      const { roleCategory } = detectRoleCategory(title, summary);
      const loc              = detectLocation(location, summary);
      const { skills }       = detectSkillPremiums(summary, title);

      return {
        estimated: false,
        currency,
        min,
        max,
        median,
        confidence: 'high',
        basis: `Salary parsed from listing: "${job.salary}"`,
        factors: {
          seniority,
          roleCategory,
          location: loc.locationLabel,
          locationTier: loc.tier,
          skills,
        },
      };
    }
    // If parsing failed, fall through to prediction
  }

  // ------------------------------------------------------------------
  // CASE 3: No salary available — predict from market data
  // ------------------------------------------------------------------

  // Detect all factors
  const { seniority, explicit: seniorityExplicit }       = detectSeniority(title, summary);
  const { roleCategory, explicit: roleExplicit }         = detectRoleCategory(title, summary);
  const { tier, multiplier, currency, locationLabel, explicit: locationExplicit } = detectLocation(location, summary);
  const { skills, totalPremium }                         = detectSkillPremiums(summary, title);

  // Get USD Tier-1 base range
  const [baseMin, baseMax] = getBaseSalary(roleCategory, seniority);

  // Apply location multiplier
  let adjMin = baseMin * multiplier;
  let adjMax = baseMax * multiplier;

  // Apply skill premium
  adjMin = adjMin * (1 + totalPremium);
  adjMax = adjMax * (1 + totalPremium);

  // Convert to local currency
  const localMin = convertCurrency(adjMin, currency);
  const localMax = convertCurrency(adjMax, currency);

  // Round to nearest sensible unit
  const roundingUnit = currency === 'INR' ? 10_000 : 1_000;
  const min    = roundToNearest(localMin, roundingUnit);
  const max    = roundToNearest(localMax, roundingUnit);
  const median = roundToNearest((min + max) / 2, roundingUnit);

  // Confidence
  const confidence = computeConfidence(seniorityExplicit, roleExplicit, locationExplicit);

  // Human-readable basis
  const seniorityLabel  = toTitleCase(seniority);
  const categoryLabel   = toTitleCase(roleCategory.replace('_', '/'));
  let basis = `Based on ${seniorityLabel} ${categoryLabel} roles in ${locationLabel}`;
  if (skills.length > 0) {
    basis += ` with ${skills.slice(0, 2).join(', ')} skills`;
  }
  basis += '.';

  return {
    estimated: true,
    currency,
    min,
    max,
    median,
    confidence,
    basis,
    factors: {
      seniority,
      roleCategory,
      location: locationLabel,
      locationTier: tier,
      skills,
    },
  };
}
