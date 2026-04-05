/**
 * ghost-detector.js
 * Ghost Job Detection engine for Midas Match
 *
 * Analyzes a job listing and returns a ghost score (0-100) along with
 * human-readable signals and a machine-readable details breakdown.
 *
 * No external dependencies. ES module syntax.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate release / stable-production year for technologies we track. */
const TECH_BIRTH_YEARS = {
  kubernetes: 2014,
  react: 2013,
  docker: 2013,
  terraform: 2014,
  "next.js": 2016,
  nextjs: 2016,
  svelte: 2016,
  rust: 2015,
  golang: 2012,
  go: 2012,
  flutter: 2017,
  swift: 2014,
  kotlin: 2016,
  typescript: 2012,
  vue: 2014,
  "vue.js": 2014,
  graphql: 2015,
  deno: 2018,
  bun: 2022,
  tailwind: 2017,
  "tailwindcss": 2017,
  prisma: 2019,
  trpc: 2020,
  "solid.js": 2021,
  solidjs: 2021,
  astro: 2021,
  remix: 2021,
  htmx: 2020,
};

/** Phrases that signal low-effort / boilerplate copy. */
const BOILERPLATE_PHRASES = [
  "fast-paced environment",
  "competitive salary",
  "great benefits",
  "dynamic team",
  "exciting opportunity",
  "looking for a rockstar",
  "work hard play hard",
  "like a family",
  "wear many hats",
  "self-starter",
];

/** Job title words that indicate an entry-level / junior position. */
const JUNIOR_INDICATORS = [
  "junior",
  "jr",
  "jr.",
  "entry",
  "entry-level",
  "associate",
  "trainee",
  "intern",
  "internship",
  "graduate",
  "grad",
];

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Normalise a string for comparison: lowercase, collapse whitespace, strip
 * most punctuation so titles like "Sr. Engineer" and "Sr Engineer" match.
 * @param {string} str
 * @returns {string}
 */
function normalizeStr(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute character-level Levenshtein distance between two strings.
 * Capped at short strings to keep performance reasonable for titles.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const la = a.length;
  const lb = b.length;

  // Allocate a (la+1) x (lb+1) matrix using a flat array.
  const dp = new Array((la + 1) * (lb + 1)).fill(0);

  for (let i = 0; i <= la; i++) dp[i * (lb + 1)] = i;
  for (let j = 0; j <= lb; j++) dp[j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i * (lb + 1) + j] = Math.min(
        dp[(i - 1) * (lb + 1) + j] + 1,      // deletion
        dp[i * (lb + 1) + (j - 1)] + 1,      // insertion
        dp[(i - 1) * (lb + 1) + (j - 1)] + cost // substitution
      );
    }
  }

  return dp[la * (lb + 1) + lb];
}

/**
 * Return a 0-1 similarity ratio between two normalised title strings.
 * 1.0 means identical, 0.0 means completely different.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function titleSimilarity(a, b) {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

/**
 * Parse a date string and return the number of calendar days since that date.
 * Returns null if the string is empty or unparseable.
 * @param {string} dateStr - ISO date or any date string
 * @returns {number|null}
 */
function calcAgeDays(dateStr) {
  if (!dateStr || typeof dateStr !== "string" || dateStr.trim() === "") {
    return null;
  }
  const posted = new Date(dateStr);
  if (isNaN(posted.getTime())) return null;
  const now = new Date();
  const diffMs = now - posted;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Extract all year-of-experience requirements from a text block.
 * Returns an array of integers (years).
 * @param {string} text
 * @returns {number[]}
 */
function extractYearsRequired(text) {
  const pattern = /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/gi;
  const results = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    results.push(parseInt(match[1], 10));
  }
  return results;
}

/**
 * Count distinct skill tokens mentioned in the combined title+summary text.
 * We use a heuristic: split on common list separators and count items that
 * look like technology/skill names (2-30 chars, no sentence punctuation).
 *
 * This is intentionally permissive — false positives are fine because they
 * will only push the score upward, which is the conservative direction.
 *
 * @param {string} text
 * @returns {number}
 */
function countDistinctSkills(text) {
  // Look for parenthetical skill lists, comma/slash/bullet-separated runs,
  // and "Experience with X, Y, and Z" patterns.
  const skillPattern =
    /\b(?:[A-Z][a-z]+(?:\.[a-z]+)?|[A-Z]{2,}(?:\+\+|#)?|[a-z]+(?:\.js|\.ts|\.py)?)\b/g;

  // Tokens we want to exclude (common English words, pronouns, articles…)
  const stopWords = new Set([
    "the", "and", "or", "for", "with", "in", "on", "at", "to", "of",
    "a", "an", "is", "are", "be", "will", "we", "you", "our", "your",
    "have", "has", "that", "this", "as", "by", "not", "from", "can",
    "must", "should", "would", "may", "work", "team", "role", "job",
    "years", "year", "yrs", "experience", "exp", "required", "preferred",
    "strong", "good", "solid", "plus", "etc", "including", "ability",
    "skills", "skill", "knowledge", "understanding", "proficiency",
    "equivalent", "degree", "bachelor", "master", "phd",
  ]);

  const found = new Set();
  let m;
  while ((m = skillPattern.exec(text)) !== null) {
    const token = m[0].toLowerCase();
    if (token.length >= 2 && token.length <= 30 && !stopWords.has(token)) {
      found.add(token);
    }
  }
  return found.size;
}

/**
 * Detect whether the job summary references a technology and requires more
 * years of experience than that technology has existed.
 *
 * @param {string} text - Combined title + summary
 * @returns {{ found: boolean, examples: string[] }}
 */
function detectTechAgeMismatch(text) {
  const currentYear = new Date().getFullYear();
  const textLower = text.toLowerCase();
  const examples = [];

  // Extract all (years, context) pairs from the text first.
  const yearsPattern =
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)\s+(?:in|with|using)?\s*([a-z][a-z0-9.\-/+ ]{1,20})/gi;

  let m;
  while ((m = yearsPattern.exec(text)) !== null) {
    const yearsRequired = parseInt(m[1], 10);
    const rawTech = m[2].trim().toLowerCase().replace(/[^a-z0-9.\-/+]/g, " ").trim();

    // Check each known tech to see if it appears in the captured context.
    for (const [tech, birthYear] of Object.entries(TECH_BIRTH_YEARS)) {
      if (rawTech.includes(tech) || textLower.includes(tech)) {
        const maxPossibleYears = currentYear - birthYear;
        if (yearsRequired > maxPossibleYears) {
          examples.push(
            `${yearsRequired}+ yrs of ${tech} (only ~${maxPossibleYears} yrs old)`
          );
        }
      }
    }
  }

  // Deduplicate examples.
  const unique = [...new Set(examples)];
  return { found: unique.length > 0, examples: unique };
}

/**
 * Assess the quality of the job description.
 * Returns 'good', 'vague', or 'boilerplate'.
 *
 * @param {string} summary
 * @returns {'good'|'vague'|'boilerplate'}
 */
function assessDescriptionQuality(summary) {
  if (!summary || summary.trim().length < 100) return "vague";

  const lowerSummary = summary.toLowerCase();

  // Count boilerplate hits.
  let boilerplateHits = 0;
  for (const phrase of BOILERPLATE_PHRASES) {
    if (lowerSummary.includes(phrase)) boilerplateHits++;
  }

  // Boilerplate ratio: if >= 3 phrases hit in a short-ish description, flag it.
  const wordCount = summary.split(/\s+/).length;
  if (boilerplateHits >= 3 || (boilerplateHits >= 2 && wordCount < 150)) {
    return "boilerplate";
  }

  // Check for structured responsibilities (bullet points, numbers, dashes).
  const hasBullets = /(?:^|\n)\s*[\-\*•·▪▸➤]\s+\w/m.test(summary);
  const hasNumberedList = /(?:^|\n)\s*\d+[.)]\s+\w/m.test(summary);

  if (!hasBullets && !hasNumberedList && wordCount < 80) {
    return "vague";
  }

  return "good";
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Analyse a job listing for ghost-job signals.
 *
 * @param {Object} job
 * @param {string}  job.title
 * @param {string}  job.summary
 * @param {string}  job.company
 * @param {string}  job.location
 * @param {string}  [job.date_posted]   ISO date string or empty
 * @param {string}  [job.source]
 * @param {string}  [job.apply_url]
 * @param {string}  [job.salary]
 * @param {number}  [job.salary_min]
 * @param {number}  [job.salary_max]
 *
 * @param {Object[]} [allJobsFromSource]  Other jobs from the same company in
 *                                        this scan (used for repost detection).
 *
 * @returns {{
 *   ghostScore: number,
 *   status: string,
 *   signals: string[],
 *   details: {
 *     ageDays: number|null,
 *     hasSalary: boolean,
 *     requirementCount: number,
 *     hasUnrealisticRequirements: boolean,
 *     isReposted: boolean,
 *     descriptionQuality: 'good'|'vague'|'boilerplate'
 *   }
 * }}
 */
export function detectGhostSignals(job, allJobsFromSource = []) {
  const signals = [];
  let score = 0;

  // Combine title + summary for full-text analysis.
  const fullText = `${job.title || ""} ${job.summary || ""}`;

  // -------------------------------------------------------------------------
  // 1. Posting Age (0-35 pts)
  // -------------------------------------------------------------------------
  const ageDays = calcAgeDays(job.date_posted);
  let agePoints = 0;

  if (ageDays === null) {
    // No date provided — suspicious but not definitive.
    agePoints = 10;
    signals.push("No posting date available");
  } else if (ageDays <= 7) {
    agePoints = 0; // Fresh — no penalty.
  } else if (ageDays <= 14) {
    agePoints = 5;
    signals.push(`Posted ${ageDays} days ago`);
  } else if (ageDays <= 30) {
    agePoints = 15;
    signals.push(`Posted ${ageDays} days ago`);
  } else if (ageDays <= 60) {
    agePoints = 25;
    signals.push(`Posted ${ageDays}+ days ago`);
  } else {
    agePoints = 35;
    signals.push(`Posted ${ageDays}+ days ago (stale)`);
  }

  score += agePoints;

  // -------------------------------------------------------------------------
  // 2. Salary Transparency (0-15 pts)
  // -------------------------------------------------------------------------
  const hasSalary = Boolean(
    job.salary ||
    (typeof job.salary_min === "number" && !isNaN(job.salary_min)) ||
    (typeof job.salary_max === "number" && !isNaN(job.salary_max))
  );

  let salaryPoints = 0;
  if (!hasSalary) {
    salaryPoints = 15;
    signals.push("No salary listed");
  }

  score += salaryPoints;

  // -------------------------------------------------------------------------
  // 3. Requirements Realism (0-20 pts)
  // -------------------------------------------------------------------------
  let requirementsPoints = 0;
  let hasUnrealisticRequirements = false;
  const requirementCount = countDistinctSkills(fullText);

  // 3a. Junior-but-high-experience mismatch.
  const titleLower = normalizeStr(job.title || "");
  const isJuniorRole = JUNIOR_INDICATORS.some((word) =>
    titleLower.split(/\s+/).includes(word)
  );

  if (isJuniorRole) {
    const yearsFound = extractYearsRequired(fullText);
    const maxYears = yearsFound.length > 0 ? Math.max(...yearsFound) : 0;
    if (maxYears >= 5) {
      requirementsPoints = Math.max(requirementsPoints, 20);
      hasUnrealisticRequirements = true;
      signals.push(
        `Entry-level title but requires ${maxYears}+ years of experience`
      );
    }
  }

  // 3b. Tech age mismatch.
  const techMismatch = detectTechAgeMismatch(fullText);
  if (techMismatch.found) {
    requirementsPoints = Math.max(requirementsPoints, 20);
    hasUnrealisticRequirements = true;
    for (const ex of techMismatch.examples) {
      signals.push(`Impossible experience requirement: ${ex}`);
    }
  }

  // 3c. Skill count overload.
  if (requirementCount >= 15) {
    requirementsPoints = Math.max(requirementsPoints, 15);
    if (!hasUnrealisticRequirements) {
      signals.push(`Excessive skill requirements (${requirementCount}+ distinct skills)`);
    }
  } else if (requirementCount >= 10) {
    requirementsPoints = Math.max(requirementsPoints, 8);
    if (!hasUnrealisticRequirements) {
      signals.push(`High number of skill requirements (${requirementCount} skills)`);
    }
  }

  score += requirementsPoints;

  // -------------------------------------------------------------------------
  // 4. Description Quality (0-15 pts)
  // -------------------------------------------------------------------------
  const summary = job.summary || "";
  const descriptionQuality = assessDescriptionQuality(summary);
  let descPoints = 0;

  if (summary.trim().length < 100) {
    descPoints = 15;
    signals.push("Description is very short or missing");
  } else if (descriptionQuality === "boilerplate") {
    // Check for missing responsibilities structure.
    const hasBullets = /(?:^|\n)\s*[\-\*•·▪▸➤]\s+\w/m.test(summary);
    const hasNumberedList = /(?:^|\n)\s*\d+[.)]\s+\w/m.test(summary);
    if (!hasBullets && !hasNumberedList) {
      // Both boilerplate-heavy AND no structure.
      descPoints = 8 + 10; // cap at 15
      descPoints = Math.min(descPoints, 15);
      signals.push("Boilerplate-heavy description with no structured responsibilities");
    } else {
      descPoints = 8;
      signals.push("Description is heavy with generic boilerplate phrases");
    }
  } else if (descriptionQuality === "vague") {
    // Has length but no structure.
    descPoints = 10;
    signals.push("Description lacks specific responsibilities or structured details");
  }

  score += descPoints;

  // -------------------------------------------------------------------------
  // 5. Reposting Pattern (0-15 pts)
  // -------------------------------------------------------------------------
  let repostPoints = 0;
  let isReposted = false;

  if (allJobsFromSource.length > 0 && job.company) {
    const thisCompany = normalizeStr(job.company);
    const thisTitle = normalizeStr(job.title || "");

    // Find other listings from the same company (excluding this exact listing).
    const sameCompanyJobs = allJobsFromSource.filter((other) => {
      if (other === job) return false; // skip self-reference
      return normalizeStr(other.company || "") === thisCompany;
    });

    for (const other of sameCompanyJobs) {
      const otherTitle = normalizeStr(other.title || "");
      const similarity = titleSimilarity(thisTitle, otherTitle);

      if (similarity >= 0.8) {
        repostPoints = 15;
        isReposted = true;
        signals.push(
          `Possible repost: "${job.title}" appears multiple times from ${job.company}`
        );
        break; // One hit is enough.
      }
    }
  }

  score += repostPoints;

  // -------------------------------------------------------------------------
  // Cap score at 100 and compute status.
  // -------------------------------------------------------------------------
  const ghostScore = Math.min(100, Math.max(0, score));

  let status;
  if (ghostScore <= 15) {
    status = "fresh";
  } else if (ghostScore <= 35) {
    status = "aging";
  } else if (ghostScore <= 60) {
    status = "stale";
  } else {
    status = "likely_ghost";
  }

  return {
    ghostScore,
    status,
    signals,
    details: {
      ageDays,
      hasSalary,
      requirementCount,
      hasUnrealisticRequirements,
      isReposted,
      descriptionQuality,
    },
  };
}
