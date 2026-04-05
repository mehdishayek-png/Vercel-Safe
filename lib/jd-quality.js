/**
 * jd-quality.js
 * Job Description Quality & Red Flag Scoring Engine
 * For use in the Midas Match job platform.
 *
 * Exports a single function: analyzeJobQuality(job)
 */

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/**
 * Red flag phrases that signal toxic culture, unclear expectations, or poor JD
 * hygiene. Each match costs -8 pts (capped at -40 total).
 */
const RED_FLAG_PHRASES = [
  "rockstar",
  "ninja",
  "guru",
  "wizard",
  "unicorn",
  "wear many hats",
  "wearing multiple hats",
  "fast-paced",
  "like a family",
  "we're a family",
  "we are a family",
  "family culture",
  "work hard play hard",
  "unlimited pto",
  "unlimited vacation",
  "unlimited time off",
  "competitive salary",
  "must be able to work under pressure",
  "other duties as assigned",
  "looking for a self-starter",
  "do what it takes",
  "whatever it takes",
  "hit the ground running",
  "thick skin",
  "thick-skinned",
  "culture fit",
];

/**
 * "competitive salary" is only a red flag when no numeric salary is present.
 * We handle this check separately in the scoring logic.
 */
const CONDITIONAL_RED_FLAGS = ["competitive salary"];

/**
 * Masculine-coded terms per research on gendered language in job ads.
 * Heavy use without feminine-coded counterparts can deter non-male applicants.
 */
const MASCULINE_TERMS = [
  "aggressive",
  "ambitious",
  "assertive",
  "competitive",
  "decisive",
  "determined",
  "dominant",
  "driven",
  "fearless",
  "independent",
  "objective",
  "outspoken",
  "strong",
];

/**
 * Feminine-coded terms. Heavy use without masculine-coded counterparts can
 * signal a role that is undervalued or subtly excludes certain applicants.
 */
const FEMININE_TERMS = [
  "compassionate",
  "nurturing",
  "supportive",
  "collaborative",
  "empathetic",
  "loyal",
  "dependable",
  "committed",
  "interpersonal",
];

/**
 * Positive signal patterns. These add points to the quality score.
 * Stored as { label, regex, points } tuples.
 */
const POSITIVE_SIGNALS = [
  {
    label: "interview_process",
    // Looks for mentions of interview stages, process, or rounds
    regex: /\b(interview\s+(process|stage|round|loop)|hiring\s+process|selection\s+process)\b/i,
    points: 5,
  },
  {
    label: "dei_accessibility",
    // D&I statements or accessibility/EEO language
    regex: /\b(equal\s+opportunity|diversity|inclusion|accessible|eeoc|belonging|eeo|aap)\b/i,
    points: 3,
  },
  {
    label: "requirements_separated",
    // Checks for explicit "required" vs "nice to have" / "preferred" separation
    regex: /\b(nice[\s-]to[\s-]have|preferred\s+qualifications?|bonus\s+(if|points)|not\s+required)\b/i,
    points: 5,
  },
];

// ---------------------------------------------------------------------------
// HELPER UTILITIES
// ---------------------------------------------------------------------------

/**
 * Normalise text for matching: lowercase, collapse whitespace.
 * @param {string} text
 * @returns {string}
 */
function normalise(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Count how many words are in a string.
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Split text into sentences on ., ?, or ! boundaries.
 * Filters out empty fragments.
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  return text
    .split(/[.?!]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Calculate average number of words per sentence.
 * Returns 0 for empty text.
 * @param {string} text
 * @returns {number}
 */
function avgWordsPerSentence(text) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + countWords(s), 0);
  return totalWords / sentences.length;
}

/**
 * Check whether the text contains a numeric salary figure
 * (e.g. "$80,000", "80k", "£50k", "USD 120,000", "85000").
 * @param {string} text
 * @returns {boolean}
 */
function containsNumericSalary(text) {
  return /(\$|£|€|usd|eur|gbp)?\s*\d[\d,]*\s*(k|per\s+(year|annum|hr|hour))?/i.test(
    text
  );
}

/**
 * Count occurrences of a whole-word or whole-phrase match in normalised text.
 * Returns the list of matched terms (with duplicates for multiple occurrences).
 * @param {string} normText - pre-normalised haystack
 * @param {string[]} terms
 * @returns {string[]} matched terms
 */
function findTermMatches(normText, terms) {
  const found = [];
  for (const term of terms) {
    // Escape regex special chars in the term
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = normText.match(re);
    if (matches) {
      // Push the canonical term once per occurrence
      for (const m of matches) {
        found.push(term);
      }
    }
  }
  return found;
}

/**
 * Detect whether the text mentions requirements for the number of applicants
 * expected (an indirect measure of requirement count via bullet-point lines).
 * Uses a simple heuristic: count lines or bullets that start with an action
 * verb or a dash/bullet character.
 * @param {string} text
 * @returns {number}
 */
function estimateRequirementCount(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let count = 0;
  for (const line of lines) {
    if (/^[-•*·]\s+/.test(line)) count++;
    else if (/^\d+[.)]\s+/.test(line)) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------------------------

/**
 * Analyse a job posting and return a structured quality report.
 *
 * @param {Object} job
 * @param {string} job.title
 * @param {string} job.summary        - Full JD text
 * @param {string} [job.company]
 * @param {string} [job.location]
 * @param {string|number} [job.salary]
 * @param {string|number} [job.salary_min]
 * @param {string|number} [job.salary_max]
 * @returns {{
 *   qualityScore: number,
 *   flags: { red: string[], yellow: string[], green: string[] },
 *   readability: string,
 *   inclusivity: string,
 *   details: {
 *     wordCount: number,
 *     requirementCount: number,
 *     hasSalary: boolean,
 *     hasRemoteInfo: boolean,
 *     hasBenefits: boolean,
 *     hasTeamInfo: boolean,
 *     hasGrowthPath: boolean,
 *     biasedTerms: string[],
 *     redFlagPhrases: string[],
 *   }
 * }}
 */
export function analyzeJobQuality(job) {
  // ------------------------------------------------------------------
  // 0. Prepare text surfaces
  // ------------------------------------------------------------------
  const summary = (job.summary || "").trim();
  const title = (job.title || "").trim();
  const location = (job.location || "").trim();

  // Combined text used for most matching (title + summary)
  const fullText = `${title} ${summary}`;
  const normFull = normalise(fullText);

  // Salary info can come from structured fields or be embedded in the text
  const hasSalaryField =
    job.salary != null || job.salary_min != null || job.salary_max != null;
  const salaryFieldHasNumber =
    hasSalaryField &&
    [job.salary, job.salary_min, job.salary_max].some(
      (v) => v != null && !isNaN(Number(String(v).replace(/[^0-9.]/g, "")))
    );
  const salaryInText = containsNumericSalary(normFull);
  const hasSalary = salaryFieldHasNumber || salaryInText;

  // ------------------------------------------------------------------
  // 1. Detail flags (boolean content checks)
  // ------------------------------------------------------------------

  // Remote/location: explicit mention of remote, hybrid, on-site, or a
  // non-empty location field.
  const hasRemoteInfo =
    location.length > 0 ||
    /\b(remote|hybrid|on[\s-]?site|in[\s-]?office|work\s+from\s+home|wfh)\b/i.test(
      fullText
    );

  // Benefits: common benefit keywords
  const hasBenefits =
    /\b(health\s+insurance|dental|vision|401k|401\(k\)|pension|pto|paid\s+time\s+off|vacation|parental\s+leave|maternity|paternity|equity|stock\s+options?|bonus|stipend|wellness|gym|commuter|snacks|catered|perks|benefits)\b/i.test(
      fullText
    );

  // Team/manager info: mentions of who you report to, team size, etc.
  const hasTeamInfo =
    /\b(report(ing)?\s+to|team\s+of|alongside|your\s+manager|your\s+team|cross[\s-]?functional|collaborate\s+with|work\s+with\s+a\s+team|direct\s+report|squad|pod)\b/i.test(
      fullText
    );

  // Growth / career path
  const hasGrowthPath =
    /\b(career\s+(growth|path|development|ladder|progression)|promotion|advance(ment)?|grow\s+(your|with|into)|mentorship|mentoring|learning\s+opportunities?|professional\s+development|upward\s+mobility)\b/i.test(
      fullText
    );

  // Word count of the summary only (title doesn't count towards length)
  const wordCount = countWords(summary);

  // Rough requirement count (bullet/numbered lines)
  const requirementCount = estimateRequirementCount(summary);

  // ------------------------------------------------------------------
  // 2. Red flag phrase detection
  // ------------------------------------------------------------------

  const detectedRedFlags = [];

  for (const phrase of RED_FLAG_PHRASES) {
    // "competitive salary" is only a red flag when no numeric salary exists
    if (CONDITIONAL_RED_FLAGS.includes(phrase)) {
      if (!hasSalary && normFull.includes(phrase)) {
        detectedRedFlags.push(phrase);
      }
      continue;
    }
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(normFull)) {
      detectedRedFlags.push(phrase);
    }
  }

  // ------------------------------------------------------------------
  // 3. Gendered language detection
  // ------------------------------------------------------------------

  const masculineMatches = findTermMatches(normFull, MASCULINE_TERMS);
  const feminineMatches = findTermMatches(normFull, FEMININE_TERMS);

  // Unique terms for reporting
  const uniqueMasculine = [...new Set(masculineMatches)];
  const uniqueFeminine = [...new Set(feminineMatches)];
  const biasedTerms = [...uniqueMasculine, ...uniqueFeminine];

  const mCount = uniqueMasculine.length;
  const fCount = uniqueFeminine.length;

  // ------------------------------------------------------------------
  // 4. Positive signal detection
  // ------------------------------------------------------------------

  const triggeredPositives = [];
  for (const signal of POSITIVE_SIGNALS) {
    if (signal.regex.test(fullText)) {
      triggeredPositives.push(signal);
    }
  }

  // ------------------------------------------------------------------
  // 5. Readability
  // ------------------------------------------------------------------

  const avg = avgWordsPerSentence(summary || fullText);
  let readability;
  if (avg < 15) {
    readability = "easy";
  } else if (avg <= 25) {
    readability = "moderate";
  } else {
    readability = "dense";
  }

  // ------------------------------------------------------------------
  // 6. Inclusivity
  // ------------------------------------------------------------------

  const totalCodedTerms = mCount + fCount;
  const skew = Math.abs(mCount - fCount);

  let inclusivity;
  if (totalCodedTerms === 0 || (skew < 3 && totalCodedTerms > 0 && mCount > 0 && fCount > 0)) {
    // Truly balanced or no coded terms at all
    inclusivity = "inclusive";
  } else if (skew >= 3) {
    // Clearly skewed in one direction
    inclusivity = "biased";
  } else {
    // Some coded terms but not heavily skewed
    inclusivity = "neutral";
  }

  // Edge case: if there are coded terms but all from one list and skew < 3
  // that can happen when mCount=1, fCount=0 (skew=1, totalCodedTerms=1)
  // In that case treat as 'neutral' (already handled above by the else branch)

  // ------------------------------------------------------------------
  // 7. Scoring
  // ------------------------------------------------------------------

  let score = 100;

  // --- Content completeness deductions ---
  if (!hasSalary) score -= 15;
  if (!hasRemoteInfo) score -= 10;
  if (!hasBenefits) score -= 5;
  if (!hasTeamInfo) score -= 5;
  if (!hasGrowthPath) score -= 3;
  if (wordCount < 200) score -= 20;
  if (wordCount > 1500) score -= 5;

  // --- Red flag deductions (-8 each, max -40) ---
  const redFlagDeduction = Math.min(detectedRedFlags.length * 8, 40);
  score -= redFlagDeduction;

  // --- Gendered language deductions (yellow, -3 each side, max -15 each) ---
  // Only penalise the dominant side when there IS a bias
  if (skew >= 3) {
    const dominantCount = Math.max(mCount, fCount);
    const genderDeduction = Math.min(dominantCount * 3, 15);
    score -= genderDeduction;
  }

  // --- Positive additions ---
  if (hasSalary) score += 10;
  if (hasBenefits) score += 5;
  if (hasTeamInfo) score += 5;
  if (hasGrowthPath) score += 5;
  for (const signal of triggeredPositives) {
    score += signal.points;
  }

  // --- Cap to [0, 100] ---
  score = Math.max(0, Math.min(100, Math.round(score)));

  // ------------------------------------------------------------------
  // 8. Build flag arrays
  // ------------------------------------------------------------------

  const redFlags = [];
  const yellowFlags = [];
  const greenFlags = [];

  // Red flags from phrases
  for (const phrase of detectedRedFlags) {
    redFlags.push(`Red flag phrase detected: "${phrase}"`);
  }

  // Content red flags
  if (wordCount < 200) {
    redFlags.push(
      `Job description is very short (${wordCount} words) — likely missing important details`
    );
  }
  if (!hasSalary) {
    redFlags.push("No salary information provided — compensation is opaque");
  }

  // Yellow flags
  if (wordCount > 1500) {
    yellowFlags.push(
      `Job description is very long (${wordCount} words) — may overwhelm candidates`
    );
  }
  if (!hasRemoteInfo) {
    yellowFlags.push("No location or remote work policy mentioned");
  }
  if (!hasBenefits) {
    yellowFlags.push("Benefits not mentioned");
  }
  if (!hasTeamInfo) {
    yellowFlags.push("No information about team structure or reporting line");
  }
  if (!hasGrowthPath) {
    yellowFlags.push("No growth or career path mentioned");
  }
  if (skew >= 3) {
    const dominant = mCount > fCount ? "masculine" : "feminine";
    const dominantTerms = mCount > fCount ? uniqueMasculine : uniqueFeminine;
    yellowFlags.push(
      `Gendered language skewed ${dominant}-coded: ${dominantTerms.join(", ")}`
    );
  }
  if (readability === "dense") {
    yellowFlags.push(
      `Dense readability — average sentence length is ${avg.toFixed(1)} words`
    );
  }

  // Green flags
  if (hasSalary) {
    greenFlags.push("Salary information is provided");
  }
  if (hasBenefits) {
    greenFlags.push("Benefits are explicitly described");
  }
  if (hasTeamInfo) {
    greenFlags.push("Team structure or reporting line is described");
  }
  if (hasGrowthPath) {
    greenFlags.push("Career growth or promotion path is mentioned");
  }
  if (hasRemoteInfo) {
    greenFlags.push("Remote/location policy is clearly stated");
  }
  for (const signal of triggeredPositives) {
    if (signal.label === "interview_process") {
      greenFlags.push("Interview process is outlined for candidates");
    } else if (signal.label === "dei_accessibility") {
      greenFlags.push("D&I or accessibility commitment is stated");
    } else if (signal.label === "requirements_separated") {
      greenFlags.push(
        'Requirements clearly separated into "required" and "nice to have"'
      );
    }
  }
  if (readability === "easy") {
    greenFlags.push("Highly readable — short, clear sentences");
  }
  if (inclusivity === "inclusive") {
    greenFlags.push("Language is inclusive with no gendered bias detected");
  }

  // ------------------------------------------------------------------
  // 9. Assemble and return result
  // ------------------------------------------------------------------

  return {
    qualityScore: score,
    flags: {
      red: redFlags,
      yellow: yellowFlags,
      green: greenFlags,
    },
    readability,
    inclusivity,
    details: {
      wordCount,
      requirementCount,
      hasSalary,
      hasRemoteInfo,
      hasBenefits,
      hasTeamInfo,
      hasGrowthPath,
      biasedTerms,
      redFlagPhrases: detectedRedFlags,
    },
  };
}
