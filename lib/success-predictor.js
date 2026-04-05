/**
 * SUCCESS PREDICTOR — Application Success Probability Estimator
 * Midas Match Job Platform
 *
 * Estimates the realistic callback probability for a given job application,
 * given the job listing, user profile, and the output from calculatePandaScore.
 *
 * No external dependencies. ES module syntax.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Words ignored when comparing profile headline to job title. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by',
  'for', 'from', 'has', 'have', 'he', 'her', 'him', 'his', 'how',
  'i', 'if', 'in', 'is', 'it', 'its', 'me', 'my', 'no', 'not',
  'of', 'on', 'or', 'our', 'she', 'so', 'than', 'that', 'the',
  'their', 'them', 'they', 'this', 'to', 'up', 'us', 'was', 'we',
  'were', 'what', 'when', 'which', 'who', 'will', 'with', 'you', 'your',
]);

/**
 * Section headers that typically gate "required" skills in a job description.
 * Skills found under these headings count toward the required-skills total.
 */
const REQUIRED_SECTION_PATTERNS = [
  /requirements?/i,
  /qualifications?/i,
  /must[\s-]have/i,
  /required\s+skills?/i,
  /what\s+you['']ll\s+need/i,
  /what\s+we['']re\s+looking\s+for/i,
  /essential\s+skills?/i,
  /mandatory/i,
];

/**
 * Section headers that gate "optional / preferred" skills.
 * Skills under these headings are excluded from the required count.
 */
const OPTIONAL_SECTION_PATTERNS = [
  /nice[\s-]to[\s-]have/i,
  /preferred/i,
  /bonus/i,
  /plus/i,
  /desirable/i,
  /optional/i,
  /advantageous/i,
];

/**
 * Pairs of related skills for recommendation generation.
 * Key: the skill the candidate is missing.
 * Values: related skills the candidate might actually have.
 */
const SKILL_RELATIVES = {
  kubernetes:  ['docker', 'helm', 'openshift', 'eks', 'gke', 'aks', 'container'],
  docker:      ['kubernetes', 'podman', 'containerd', 'lxc'],
  graphql:     ['rest', 'api', 'apollo', 'grpc', 'swagger'],
  terraform:   ['ansible', 'pulumi', 'cloudformation', 'cdk', 'bicep'],
  aws:         ['gcp', 'azure', 'cloud', 'ec2', 's3', 'lambda'],
  gcp:         ['aws', 'azure', 'cloud', 'bigquery'],
  azure:       ['aws', 'gcp', 'cloud', 'devops'],
  typescript:  ['javascript', 'js', 'es6', 'node'],
  react:       ['vue', 'angular', 'svelte', 'next', 'nuxt', 'frontend'],
  python:      ['ruby', 'go', 'java', 'kotlin', 'scala', 'r'],
  postgresql:  ['mysql', 'mariadb', 'sqlite', 'sql', 'database'],
  mysql:       ['postgresql', 'mariadb', 'sqlite', 'sql', 'database'],
  mongodb:     ['couchdb', 'dynamodb', 'firestore', 'nosql'],
  redis:       ['memcached', 'cache', 'elasticache'],
  kafka:       ['rabbitmq', 'sqs', 'pubsub', 'kinesis', 'nats', 'messaging'],
  elasticsearch: ['solr', 'opensearch', 'search', 'kibana'],
  figma:       ['sketch', 'xd', 'zeplin', 'invision', 'design'],
  salesforce:  ['hubspot', 'dynamics', 'crm', 'zoho'],
  gainsight:   ['totango', 'churnzero', 'planhat', 'vitally', 'customer success'],
  jira:        ['linear', 'asana', 'trello', 'project management', 'confluence'],
  dbt:         ['airflow', 'spark', 'data pipeline', 'etl', 'sql'],
  spark:       ['hadoop', 'flink', 'dbt', 'bigquery', 'data pipeline'],
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Tokenises a string into lowercase words, stripping punctuation and
 * discarding stop words.
 * @param {string} text
 * @returns {Set<string>}
 */
function tokenise(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s+#]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w))
  );
}

/**
 * Clamp a number between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Parse a multiplier string from pandaResult.multipliers into a float.
 * Returns the fallback value when parsing fails.
 * @param {string|number} raw
 * @param {number} fallback
 * @returns {number}
 */
function parseMultiplier(raw, fallback = 1.0) {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

// ---------------------------------------------------------------------------
// 1. Skill Coverage Analysis
// ---------------------------------------------------------------------------

/**
 * Attempts to locate a "Requirements" section in the JD and extract the skill
 * names mentioned there. Falls back to the first 800 characters when no
 * clear section header is found.
 *
 * @param {string} summary  Full job description / summary text.
 * @param {{ skill: string, value: number }[]} pandaMatches  Already-matched skills.
 * @returns {{ requiredSkills: string[], optionalSkills: string[], usedFallback: boolean }}
 */
function extractJDSkillSections(summary, pandaMatches) {
  if (!summary) {
    return { requiredSkills: [], optionalSkills: [], usedFallback: true };
  }

  // Split on newlines for section detection
  const lines = summary.split(/\r?\n/);

  let inRequired = false;
  let inOptional = false;
  const requiredLines = [];
  const optionalLines = [];

  for (const line of lines) {
    const stripped = line.trim();

    // Check if this line is a section header
    const isRequiredHeader = REQUIRED_SECTION_PATTERNS.some(p => p.test(stripped));
    const isOptionalHeader = OPTIONAL_SECTION_PATTERNS.some(p => p.test(stripped));

    if (isRequiredHeader) {
      inRequired = true;
      inOptional = false;
      continue;
    }
    if (isOptionalHeader) {
      inOptional = true;
      inRequired = false;
      continue;
    }

    // A new all-caps or title-case heading likely closes the current section
    if (stripped.length > 0 && stripped.length < 60 && /^[A-Z]/.test(stripped) && !/^[a-z]/.test(stripped) && !stripped.startsWith('•') && !stripped.startsWith('-')) {
      // Only end sections if this looks like a heading, not just a capitalised bullet
      if (stripped === stripped.toUpperCase() || /^[A-Z][a-z]/.test(stripped)) {
        inRequired = false;
        inOptional = false;
      }
    }

    if (inRequired) requiredLines.push(stripped);
    if (inOptional) optionalLines.push(stripped);
  }

  // If we found actual content in required sections, extract skills from them
  if (requiredLines.length > 0) {
    const requiredText = requiredLines.join(' ');
    const optionalText = optionalLines.join(' ');
    return {
      requiredSkills: extractSkillTokens(requiredText, pandaMatches),
      optionalSkills: extractSkillTokens(optionalText, pandaMatches),
      usedFallback: false,
    };
  }

  // Fallback: use first 800 chars of the summary
  const fallbackText = summary.slice(0, 800);
  return {
    requiredSkills: extractSkillTokens(fallbackText, pandaMatches),
    optionalSkills: [],
    usedFallback: true,
  };
}

/**
 * Given free-form text and the list of skills that pandaResult already knows
 * about, return those skills that appear in the text.
 *
 * We deliberately restrict ourselves to pandaResult.matches skill names rather
 * than doing independent NLP — this keeps the two modules consistent.
 *
 * @param {string} text
 * @param {{ skill: string, value: number }[]} pandaMatches
 * @returns {string[]}
 */
function extractSkillTokens(text, pandaMatches) {
  if (!text || !Array.isArray(pandaMatches)) return [];
  const lower = text.toLowerCase();
  // Collect skill names that appear verbatim in the text
  const found = new Set();
  for (const { skill } of pandaMatches) {
    if (skill && lower.includes(skill.toLowerCase())) {
      found.add(skill.toLowerCase());
    }
  }
  return Array.from(found);
}

/**
 * Compute the skill-match breakdown.
 *
 * @param {string} summary
 * @param {{ skill: string, value: number }[]} matches  pandaResult.matches
 * @param {string[]} profileSkills
 * @returns {{ matched: number, total: number, percentage: number, missingSkills: string[] }}
 */
function analyseSkillCoverage(summary, matches, profileSkills) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { matched: 0, total: 0, percentage: 0, missingSkills: [] };
  }

  const { requiredSkills, usedFallback } = extractJDSkillSections(summary, matches);

  // Normalise profile skills for lookup
  const profileSkillsLower = new Set(
    (profileSkills || []).map(s => s.toLowerCase())
  );

  // The "total required" pool: prefer section-extracted, fallback to all matched skills
  const pool = requiredSkills.length > 0
    ? requiredSkills
    : matches.map(m => m.skill.toLowerCase());

  // Which of those did panda already find as matched?
  const matchedSkillNames = new Set(matches.map(m => m.skill.toLowerCase()));

  const matchedInPool = pool.filter(s => matchedSkillNames.has(s));
  const missingInPool = pool.filter(s => !matchedSkillNames.has(s));

  const total = pool.length;
  const matched = matchedInPool.length;
  const percentage = total > 0 ? Math.round((matched / total) * 100) : 0;

  return {
    matched,
    total,
    percentage,
    missingSkills: missingInPool,
    usedFallback,
  };
}

// ---------------------------------------------------------------------------
// 2. Experience Match
// ---------------------------------------------------------------------------

/**
 * Extract a years-of-experience requirement from the JD text.
 * Returns { min, max, midpoint } or null when not found.
 *
 * Handles patterns like:
 *   "3+ years", "5-8 years", "minimum 4 years", "3 to 7 years"
 *
 * @param {string} text
 * @returns {{ min: number, max: number, midpoint: number } | null}
 */
function extractYearsRequirement(text) {
  if (!text) return null;

  const lower = text.toLowerCase();

  // Range patterns: "3-7 years", "3 to 7 years"
  const rangeMatch = lower.match(/(\d+)\s*[-–to]+\s*(\d+)\s*\+?\s*(?:years?|yrs?)/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    return { min, max, midpoint: (min + max) / 2 };
  }

  // Single value with plus: "3+ years", "minimum 5 years"
  const singleMatch = lower.match(/(\d+)\s*\+?\s*(?:years?|yrs?)/gi);
  if (singleMatch) {
    // Take the first sensible number (ignore things like "Fortune 500")
    for (const m of singleMatch) {
      const n = parseInt(m, 10);
      if (n >= 0 && n <= 40) {
        // "+", treat as min with an open upper bound (add 3 years as soft max)
        const isPlus = m.includes('+');
        return {
          min: n,
          max: isPlus ? n + 4 : n,
          midpoint: isPlus ? n + 2 : n,
        };
      }
    }
  }

  return null;
}

/**
 * Classify how the candidate's experience compares to the JD requirement.
 *
 * @param {number|undefined} profileYears
 * @param {string} summary
 * @returns {'exact' | 'close' | 'reaching_up' | 'overqualified' | 'unknown'}
 */
function classifyExperienceMatch(profileYears, summary) {
  if (profileYears == null || !summary) return 'unknown';

  const req = extractYearsRequirement(summary);
  if (!req) return 'unknown';

  const diff = profileYears - req.midpoint;

  if (Math.abs(diff) <= 1) return 'exact';
  if (Math.abs(diff) <= 2) return 'close';
  if (diff < -2) return 'reaching_up';       // candidate is under by 3+ years
  if (diff > 4) return 'overqualified';       // candidate is over by 5+ years
  return 'close';                             // over by 3-4 years — still close
}

// ---------------------------------------------------------------------------
// 3. Location Match
// ---------------------------------------------------------------------------

/**
 * @param {number} locationMultiplier
 * @returns {'exact' | 'same_country' | 'remote' | 'mismatch'}
 */
function classifyLocationMatch(locationMultiplier) {
  if (locationMultiplier >= 1.3) return 'exact';
  if (locationMultiplier >= 1.0) return 'same_country';
  if (locationMultiplier >= 0.5) return 'remote';
  return 'mismatch';
}

// ---------------------------------------------------------------------------
// 4. Domain Match
// ---------------------------------------------------------------------------

/**
 * @param {string} domainDetail  'match' | 'mismatch' | 'undetected'
 * @param {number} domainMultiplier
 * @returns {'strong' | 'partial' | 'weak' | 'mismatch'}
 */
function classifyDomainMatch(domainDetail, domainMultiplier) {
  if (domainDetail === 'match' && domainMultiplier >= 1.1) return 'strong';
  if (domainDetail === 'match') return 'partial';
  if (domainDetail === 'undetected') return 'weak';
  return 'mismatch';
}

// ---------------------------------------------------------------------------
// 5. Seniority Match
// ---------------------------------------------------------------------------

/**
 * @param {number} seniorityMultiplier
 * @returns {'exact' | 'close' | 'reaching_up' | 'overqualified'}
 */
function classifySeniorityMatch(seniorityMultiplier) {
  if (seniorityMultiplier >= 1.2) return 'exact';
  if (seniorityMultiplier >= 1.0) return 'close';
  if (seniorityMultiplier >= 0.5) return 'reaching_up';
  return 'overqualified';
}

// ---------------------------------------------------------------------------
// 6. Title Match
// ---------------------------------------------------------------------------

/**
 * Compare profile headline to job title via word overlap (excluding stop words).
 *
 * @param {string} headline   Profile headline
 * @param {string} jobTitle   Job title
 * @returns {'exact' | 'related' | 'different'}
 */
function classifyTitleMatch(headline, jobTitle) {
  const headlineTokens = tokenise(headline || '');
  const titleTokens    = tokenise(jobTitle  || '');

  if (titleTokens.size === 0) return 'different';

  // Count how many job-title tokens appear in the headline
  let overlap = 0;
  for (const word of titleTokens) {
    if (headlineTokens.has(word)) overlap++;
  }

  const overlapRatio = overlap / titleTokens.size;

  if (overlapRatio >= 0.70) return 'exact';
  if (overlapRatio >= 0.30) return 'related';
  return 'different';
}

// ---------------------------------------------------------------------------
// 7. Recency
// ---------------------------------------------------------------------------

/**
 * @param {number} recencyMultiplier
 * @returns {'fresh' | 'recent' | 'aging' | 'stale'}
 */
function classifyRecency(recencyMultiplier) {
  if (recencyMultiplier >= 1.1) return 'fresh';
  if (recencyMultiplier >= 0.8) return 'recent';
  if (recencyMultiplier >= 0.5) return 'aging';
  return 'stale';
}

// ---------------------------------------------------------------------------
// 8. Probability Calculation
// ---------------------------------------------------------------------------

/**
 * Compute the final callback probability percentage.
 *
 * @param {number} pandaScore  0-100 overall match score
 * @param {object} breakdown
 * @returns {number}  Clamped to 2–65
 */
function computeProbabilityPercentage(pandaScore, breakdown) {
  // Base from pandaScore band
  let base;
  if      (pandaScore >= 80) base = 40;
  else if (pandaScore >= 60) base = 25;
  else if (pandaScore >= 40) base = 12;
  else if (pandaScore >= 20) base = 5;
  else                       base = 2;

  let adj = 0;

  // Skill coverage
  const skillPct = breakdown.skillMatch.percentage;
  if      (skillPct >= 80) adj += 15;
  else if (skillPct >= 60) adj += 8;

  // Experience
  if      (breakdown.experienceMatch === 'exact')       adj += 10;
  else if (breakdown.experienceMatch === 'close')       adj += 5;
  else if (breakdown.experienceMatch === 'reaching_up') adj -= 5;

  // Location
  if      (breakdown.locationMatch === 'exact')    adj += 5;
  else if (breakdown.locationMatch === 'mismatch') adj -= 10;

  // Recency
  if      (breakdown.recency === 'fresh') adj += 5;
  else if (breakdown.recency === 'stale') adj -= 10;

  // Domain
  if      (breakdown.domainMatch === 'strong')   adj += 5;
  else if (breakdown.domainMatch === 'mismatch') adj -= 10;

  return clamp(base + adj, 2, 65);
}

/**
 * Map a percentage to a probability label.
 *
 * @param {number} pct
 * @returns {'high' | 'medium' | 'low' | 'very_low'}
 */
function probabilityLabel(pct) {
  if (pct >= 30) return 'high';
  if (pct >= 15) return 'medium';
  if (pct >= 8)  return 'low';
  return 'very_low';
}

// ---------------------------------------------------------------------------
// 9. Strengths
// ---------------------------------------------------------------------------

/**
 * Build human-readable strength strings from positive signals.
 *
 * @param {object} breakdown
 * @param {object} context   Extra data needed for specific messages
 * @returns {string[]}
 */
function generateStrengths(breakdown, context) {
  const { profileYears, summary, jobLocation, pandaResult } = context;
  const strengths = [];

  // Skill match
  const { matched, total } = breakdown.skillMatch;
  if (matched > 0 && total > 0) {
    strengths.push(`${matched} of ${total} required skills matched`);
  }

  // Experience
  if (breakdown.experienceMatch === 'exact' || breakdown.experienceMatch === 'close') {
    const req = extractYearsRequirement(summary);
    if (req && profileYears != null) {
      const rangeStr = req.min === req.max
        ? `${req.min} years`
        : `${req.min}–${req.max} years`;
      strengths.push(
        `Your ${profileYears} year${profileYears !== 1 ? 's' : ''} of experience fits their ${rangeStr} requirement`
      );
    }
  }

  // Location
  if (breakdown.locationMatch === 'exact') {
    // Try to extract a city name from the job location string
    const city = (jobLocation || '').split(',')[0].trim();
    strengths.push(city ? `Exact location match (${city})` : 'Exact location match');
  } else if (breakdown.locationMatch === 'same_country') {
    strengths.push('Same country — no relocation required');
  } else if (breakdown.locationMatch === 'remote') {
    strengths.push('Role is remote-friendly');
  }

  // Domain
  if (breakdown.domainMatch === 'strong') {
    strengths.push('Strong domain overlap with your background');
  } else if (breakdown.domainMatch === 'partial') {
    strengths.push('Partial domain overlap — transferable experience');
  }

  // Seniority
  if (breakdown.seniorityMatch === 'exact') {
    strengths.push('Seniority level is a strong match');
  } else if (breakdown.seniorityMatch === 'close') {
    strengths.push('Seniority level is close to requirements');
  }

  // Title
  if (breakdown.titleMatch === 'exact') {
    strengths.push('Your headline directly mirrors the job title');
  } else if (breakdown.titleMatch === 'related') {
    strengths.push('Your headline is closely related to the job title');
  }

  // Recency
  if (breakdown.recency === 'fresh') {
    strengths.push('Job posted very recently — high competition window is open');
  }

  return strengths;
}

// ---------------------------------------------------------------------------
// 10. Gaps
// ---------------------------------------------------------------------------

/**
 * Build human-readable gap strings from negative signals.
 *
 * @param {object} breakdown
 * @param {object} context
 * @returns {string[]}
 */
function generateGaps(breakdown, context) {
  const { profileYears, summary, jobLocation } = context;
  const gaps = [];

  // Missing skills
  for (const skill of (context.missingSkills || [])) {
    gaps.push(`Missing required skill: ${skill}`);
  }

  // Experience gap
  if (breakdown.experienceMatch === 'reaching_up') {
    const req = extractYearsRequirement(summary);
    if (req && profileYears != null) {
      gaps.push(
        `They want ${req.min}+ years of experience, you have ${profileYears}`
      );
    } else {
      gaps.push('Experience level may fall short of requirements');
    }
  } else if (breakdown.experienceMatch === 'overqualified') {
    gaps.push('You may be overqualified — consider tailoring your application');
  }

  // Location
  if (breakdown.locationMatch === 'mismatch') {
    const city = (jobLocation || '').split(',')[0].trim();
    gaps.push(
      city
        ? `Location mismatch — they want ${city}`
        : 'Location does not match the job\'s requirement'
    );
  }

  // Domain
  if (breakdown.domainMatch === 'mismatch') {
    gaps.push('Your domain background does not align with this role');
  }

  // Recency
  if (breakdown.recency === 'stale') {
    gaps.push('Job posting is old — role may already be filled');
  }

  // Seniority
  if (breakdown.seniorityMatch === 'reaching_up') {
    gaps.push('Role appears to be more senior than your current level');
  } else if (breakdown.seniorityMatch === 'overqualified') {
    gaps.push('Role appears to be more junior than your experience level');
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// 11. Recommendations
// ---------------------------------------------------------------------------

/**
 * Generate 1-3 actionable tips the candidate can act on before applying.
 *
 * @param {object} breakdown
 * @param {object} context
 * @param {string[]} profileSkills  Normalised profile skill list
 * @returns {string[]}
 */
function generateRecommendations(breakdown, context, profileSkills) {
  const recs = [];
  const profileSkillsLower = (profileSkills || []).map(s => s.toLowerCase());

  // Missing-skill → related-skill bridge
  for (const missingSkill of (context.missingSkills || [])) {
    if (recs.length >= 2) break; // cap bridge suggestions at 2

    const relatives = SKILL_RELATIVES[missingSkill.toLowerCase()] || [];
    const ownedRelative = relatives.find(rel =>
      profileSkillsLower.some(ps => ps.includes(rel))
    );
    if (ownedRelative) {
      // Find the canonical label from the profile (preserves original casing)
      const label = (profileSkills || []).find(ps =>
        ps.toLowerCase().includes(ownedRelative)
      ) || ownedRelative;
      recs.push(
        `Mention your ${label} experience — it's closely related to their ${missingSkill} requirement`
      );
    }
  }

  // Seniority gap
  if (breakdown.seniorityMatch === 'reaching_up' && recs.length < 3) {
    recs.push(
      'Emphasise any leadership, mentoring, or project-ownership experience to offset the seniority gap'
    );
  }

  // Location mismatch
  if (breakdown.locationMatch === 'mismatch' && recs.length < 3) {
    // If domain is ok, relocation might be worth suggesting
    if (breakdown.domainMatch !== 'mismatch') {
      recs.push(
        'State your willingness to relocate or work in their timezone to overcome the location mismatch'
      );
    }
  }

  // Overqualified — soften the pitch
  if (breakdown.experienceMatch === 'overqualified' && recs.length < 3) {
    recs.push(
      'Tailor your CV to highlight the skills most relevant to this role — avoid overwhelming them with seniority signals'
    );
  }

  // Stale posting
  if (breakdown.recency === 'stale' && recs.length < 3) {
    recs.push(
      'The posting looks old — reach out to the hiring manager directly on LinkedIn to confirm it\'s still open before investing time in the application'
    );
  }

  // Weak domain — suggest framing
  if (breakdown.domainMatch === 'weak' && recs.length < 3) {
    recs.push(
      'Your domain experience is unclear from the data — explicitly call out relevant industry projects or clients in your cover letter'
    );
  }

  return recs.slice(0, 3);
}

// ---------------------------------------------------------------------------
// 12. Headline generator
// ---------------------------------------------------------------------------

/**
 * Build a single-sentence headline summarising the match quality.
 *
 * @param {string} probability   'high' | 'medium' | 'low' | 'very_low'
 * @param {object} breakdown
 * @returns {string}
 */
function generateHeadline(probability, breakdown) {
  const { matched, total } = breakdown.skillMatch;
  const skillSummary = total > 0
    ? ` — you match ${matched} of ${total} required skills`
    : '';

  switch (probability) {
    case 'high':
      return `Strong candidate${skillSummary}`;
    case 'medium':
      return `Solid fit with some gaps${skillSummary}`;
    case 'low':
      return `Partial match — significant gaps to address${skillSummary}`;
    case 'very_low':
    default:
      return `Unlikely fit — several critical requirements are missing${skillSummary}`;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Predict the application success probability for a job + profile pair.
 *
 * @param {object} job
 * @param {string}  job.title
 * @param {string}  job.summary
 * @param {string}  job.company
 * @param {string}  job.location
 * @param {string}  job.date_posted
 * @param {number}  [job.salary_min]
 * @param {number}  [job.salary_max]
 *
 * @param {object}   profile
 * @param {string}   profile.headline
 * @param {string[]} profile.skills
 * @param {number}   profile.experience_years
 *
 * @param {object} pandaResult          Output from calculatePandaScore
 * @param {number} pandaResult.score    0-100 overall match score
 * @param {number} pandaResult.raw      Raw keyword score
 * @param {{ skill: string, value: number }[]} pandaResult.matches
 * @param {object} pandaResult.multipliers
 *
 * @returns {{
 *   probability: string,
 *   percentage: number,
 *   headline: string,
 *   strengths: string[],
 *   gaps: string[],
 *   recommendations: string[],
 *   breakdown: {
 *     skillMatch: { matched: number, total: number, percentage: number },
 *     experienceMatch: string,
 *     locationMatch: string,
 *     domainMatch: string,
 *     seniorityMatch: string,
 *     titleMatch: string,
 *     recency: string,
 *   }
 * }}
 */
export function predictSuccessProbability(job, profile, pandaResult) {
  // ── Guard: provide safe defaults so callers don't have to defensively check ──
  const safeJob = job || {};
  const safeProfile = profile || {};
  const safePanda = pandaResult || {};
  const multipliers = safePanda.multipliers || {};
  const matches = Array.isArray(safePanda.matches) ? safePanda.matches : [];

  const summary         = safeJob.summary || '';
  const profileSkills   = Array.isArray(safeProfile.skills) ? safeProfile.skills : [];
  const profileYears    = safeProfile.experience_years ?? null;
  const pandaScore      = typeof safePanda.score === 'number' ? safePanda.score : 0;

  // ── Parse multipliers (all stored as strings in pandaResult) ──────────────
  const locationMult  = parseMultiplier(multipliers.location,  1.0);
  const domainMult    = parseMultiplier(multipliers.domain,    1.0);
  const seniorityMult = parseMultiplier(multipliers.seniority, 1.0);
  const recencyMult   = parseMultiplier(multipliers.recency,   1.0);
  const domainDetail  = multipliers.domainDetail || 'undetected';

  // ── Step 1: Skill coverage ────────────────────────────────────────────────
  const { matched, total, percentage: skillPercentage, missingSkills } =
    analyseSkillCoverage(summary, matches, profileSkills);

  // ── Steps 2-7: Classify each dimension ───────────────────────────────────
  const experienceMatch = classifyExperienceMatch(profileYears, summary);
  const locationMatch   = classifyLocationMatch(locationMult);
  const domainMatch     = classifyDomainMatch(domainDetail, domainMult);
  const seniorityMatch  = classifySeniorityMatch(seniorityMult);
  const titleMatch      = classifyTitleMatch(safeProfile.headline, safeJob.title);
  const recency         = classifyRecency(recencyMult);

  // ── Assemble breakdown ────────────────────────────────────────────────────
  const breakdown = {
    skillMatch:      { matched, total, percentage: skillPercentage },
    experienceMatch,
    locationMatch,
    domainMatch,
    seniorityMatch,
    titleMatch,
    recency,
  };

  // ── Step 8: Probability calculation ───────────────────────────────────────
  const percentage  = computeProbabilityPercentage(pandaScore, breakdown);
  const probability = probabilityLabel(percentage);

  // ── Context bundle for message generators ────────────────────────────────
  const ctx = {
    profileYears,
    summary,
    jobLocation: safeJob.location || '',
    missingSkills: missingSkills || [],
    pandaResult: safePanda,
  };

  // ── Steps 9-11: Human-readable outputs ────────────────────────────────────
  const strengths        = generateStrengths(breakdown, ctx);
  const gaps             = generateGaps(breakdown, ctx);
  const recommendations  = generateRecommendations(breakdown, ctx, profileSkills);

  // ── Step 12: Headline ─────────────────────────────────────────────────────
  const headline = generateHeadline(probability, breakdown);

  return {
    probability,
    percentage,
    headline,
    strengths,
    gaps,
    recommendations,
    breakdown,
  };
}
