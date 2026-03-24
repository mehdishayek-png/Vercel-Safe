// lib/matcher.js — Job matching engine (faithful port of RELIABLE run_auto_apply.py v7)
//
// This is the EXACT logic from the reliable Python backup:
// 1. Title synonym expansion (huge map covering all major job families)
// 2. Primary + Secondary + Title keyword extraction with stem expansion
// 3. Local scoring with weighted keyword lengths
// 4. LLM batch scoring (40% local + 60% LLM)
// 5. Source priority boost + Location boost
// 6. Adaptive thresholds (55 → 50 → 45)
// 7. Company diversity enforcement

const MAX_MATCHES = 25;
const LLM_BATCH_SIZE = 15;
const MAX_LLM_CANDIDATES = 50;
const MATCH_THRESHOLD = 35;  // Generous — let LLM decide (was 25, Python uses 35)
const MAX_PER_COMPANY = 3;
const API_RATE_LIMIT = 600; // ms between batches

// ============================================
// SENIORITY DETECTION (improved — granular levels)
// ============================================
// Levels: exec(5) > senior(4) > manager(3) > mid(2) > entry(1) > open(0)
// This allows proper penalty calculation between e.g. specialist(1) and manager(3)

const EXEC_MARKERS = [
  'director', 'vp ', 'vice president', 'principal', 'chief',
  'cto', 'coo', 'ceo', 'cfo', 'founding', 'co-founder',
  'partner', 'svp', 'evp', 'head of', 'head,',
  'staff engineer', 'staff developer', 'distinguished',
];

const SENIOR_MARKERS = [
  'senior', 'sr ', 'sr.', 'lead', 'team lead',
];

const MANAGER_MARKERS = [
  'manager', 'supervisor', 'superintendent',
];

const MID_MARKERS = [
  'mid-level', 'mid level', 'intermediate',
];

const ENTRY_MARKERS = [
  'specialist', 'coordinator', 'associate', 'analyst',
  'executive', 'representative', 'assistant', 'administrator',
  'agent', 'officer',
];

// Returns a numeric level 0-5 for granular comparison
function titleSeniorityLevel(title) {
  const t = (title || '').toLowerCase();

  // Markers that could be substrings of other words need word-boundary matching
  // e.g. "coo" inside "coordinator", "director" inside "coordinator"
  const BOUNDARY_EXEC = ['director', 'cto', 'coo', 'ceo', 'cfo', 'svp', 'evp'];

  const hasExecMarker = EXEC_MARKERS.some(m => {
    if (BOUNDARY_EXEC.includes(m)) {
      return new RegExp(`\\b${m}\\b`).test(t);
    }
    return t.includes(m);
  });
  if (hasExecMarker) return 5;

  if (SENIOR_MARKERS.some(m => t.includes(m))) return 4;
  if (MANAGER_MARKERS.some(m => t.includes(m))) return 3;
  if (MID_MARKERS.some(m => t.includes(m))) return 2;
  if (ENTRY_MARKERS.some(m => t.includes(m))) return 1;
  return 0; // open/unknown
}

// Legacy compat — used by the hard seniority gate
function titleSeniority(title) {
  const level = titleSeniorityLevel(title);
  if (level >= 4) return 'senior'; // senior + exec
  if (level >= 2) return 'mid';    // manager + mid
  return 'open';                   // entry + unknown
}

// Detect candidate's own seniority from their headline
function candidateSeniorityLevel(headline) {
  return titleSeniorityLevel(headline);
}

// ============================================
// EXPERIENCE ESTIMATION (exact Python port)
// ============================================

export function estimateYears(profile) {
  // Check if explicitly provided by frontend
  if (typeof profile.experience_years === 'number') return profile.experience_years;

  const expStr = (profile.experience || '').trim();
  const map = {
    '0–1 years': 0, '0-1 years': 0,
    '1–3 years': 2, '1-3 years': 2,
    '3–6 years': 4, '3-6 years': 4,
    '6–10 years': 7, '6-10 years': 7,
    '10+ years': 12,
  };
  if (map[expStr] !== undefined) return map[expStr];

  const headline = (profile.headline || '').toLowerCase();

  // Method 1: Explicit years in headline
  const m = headline.match(/(\d+)\+?\s*(?:years?|yrs?)/);
  if (m) return parseInt(m[1]);

  // Method 2: Seniority markers
  if (/intern|trainee|fresher|entry.?level/.test(headline)) return 0;
  if (/junior|associate|jr[\s.]/.test(headline)) return 1;
  if (/mid.?level|intermediate/.test(headline)) return 3;
  if (/senior|sr[\s.]|lead/.test(headline)) return 6;
  if (/staff|principal/.test(headline)) return 8;
  if (/manager|team lead/.test(headline)) return 5;
  if (/director|head of|vp[\s]|vice president/.test(headline)) return 10;
  if (/chief|cto|coo|ceo|cfo|executive/.test(headline)) return 12;

  // Method 3: Role-based
  if (/architect|consultant/.test(headline)) return 5;
  if (/specialist|analyst|coordinator|engineer|developer/.test(headline)) {
    const skillCount = (profile.skills || []).length;
    if (skillCount >= 30) return 5;
    if (skillCount >= 20) return 4;
    if (skillCount >= 10) return 3;
    return 2;
  }

  // Method 4: Skill count fallback
  const skillCount = (profile.skills || []).length;
  if (skillCount >= 40) return 7;
  if (skillCount >= 30) return 5;
  if (skillCount >= 20) return 4;
  if (skillCount >= 15) return 3;
  if (skillCount >= 10) return 2;
  if (skillCount >= 5) return 1;

  return 1;
}

// ============================================
// TITLE SYNONYMS (exact Python port — the secret sauce)
// ============================================

const TITLE_SYNONYMS = {
  // Construction & Project Management
  'construction': ['construction', 'building', 'project', 'site', 'contractor', 'general contractor'],
  'construction manager': ['construction manager', 'construction supervisor', 'project manager', 'site manager', 'construction lead', 'project coordinator', 'pm'],
  'project manager': ['project manager', 'program manager', 'construction manager', 'project lead', 'pm', 'pmo', 'delivery manager'],
  'construction supervisor': ['construction supervisor', 'site supervisor', 'construction manager', 'foreman', 'site lead'],

  // Customer Support & Success
  'customer support': ['customer support', 'customer service', 'technical support', 'support specialist', 'help desk', 'customer care'],
  'customer success': ['customer success', 'customer support', 'client success', 'account manager', 'customer experience'],
  'customer experience': ['customer experience', 'cx specialist', 'customer success', 'customer support', 'client experience'],
  'support specialist': ['support specialist', 'support engineer', 'customer support', 'technical support', 'help desk'],

  // Engineering & Development
  'software engineer': ['software engineer', 'software developer', 'developer', 'engineer', 'programmer', 'sde'],
  'developer': ['developer', 'software developer', 'software engineer', 'engineer', 'programmer', 'coder'],
  'engineer': ['engineer', 'software engineer', 'developer', 'technical engineer', 'solutions engineer'],
  'full stack': ['full stack', 'fullstack', 'full-stack developer', 'software engineer', 'web developer'],

  // Data & Analytics
  'data analyst': ['data analyst', 'business analyst', 'analytics', 'data specialist', 'analyst'],
  'business analyst': ['business analyst', 'data analyst', 'analyst', 'ba', 'business intelligence'],
  'analyst': ['analyst', 'data analyst', 'business analyst', 'research analyst', 'systems analyst'],

  // Sales & Marketing
  'account manager': ['account manager', 'customer success', 'account executive', 'client manager', 'relationship manager'],
  'account executive': ['account executive', 'sales executive', 'ae', 'account manager', 'sales representative'],
  'sales': ['sales', 'business development', 'account executive', 'sales representative', 'sales engineer'],

  // Operations & Management
  'operations': ['operations', 'ops', 'operations manager', 'operations specialist', 'operational'],
  'consultant': ['consultant', 'consulting', 'advisor', 'specialist', 'expert'],
  'coordinator': ['coordinator', 'specialist', 'associate', 'administrator', 'organizer'],

  // Design & Creative
  'designer': ['designer', 'ui designer', 'ux designer', 'graphic designer', 'product designer', 'visual designer'],
  'product designer': ['product designer', 'ux designer', 'ui/ux designer', 'designer', 'user experience designer'],
};

// ============================================
// KEYWORD EXTRACTION (exact Python port)
// ============================================

const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'into', 'our', 'you', 'your',
  'tool', 'tools', 'using', 'used', 'based', 'related', 'across',
  'including', 'such', 'various', 'multiple', 'key', 'core', 'new',
  'high', 'low', 'top', 'best', 'good', 'main', 'major', 'full',
]);

const STEM_MAP = {
  financial: ['finance', 'financial'],
  finance: ['financial', 'finance'],
  analysis: ['analyst', 'analytics', 'analytical'],
  analyst: ['analysis', 'analytics', 'analytical'],
  analytics: ['analyst', 'analysis', 'analytical'],
  operations: ['operational', 'ops'],
  operational: ['operations', 'ops'],
  management: ['manager', 'managing'],
  manager: ['management', 'managing'],
  consulting: ['consultant', 'consultancy'],
  consultant: ['consulting', 'consultancy'],
  marketing: ['market', 'marketer'],
  engineering: ['engineer', 'engineers'],
  engineer: ['engineering', 'engineers'],
  development: ['developer', 'developing'],
  developer: ['development', 'developing'],
  accounting: ['accountant', 'accounts'],
  accountant: ['accounting', 'accounts'],
  strategy: ['strategic', 'strategist'],
  strategic: ['strategy', 'strategist'],
  automation: ['automated', 'automate'],
  data: ['data'],
  product: ['product'],
  sales: ['sales'],
  support: ['support'],
  technical: ['tech', 'technology'],
  technology: ['tech', 'technical'],
};

const DOMAIN_TERMS = [
  // General professional
  'support', 'operations', 'management', 'integration', 'consulting',
  'technical', 'implementation', 'automation', 'monitoring',
  'troubleshooting', 'analyst', 'coordinator', 'specialist',
  'customer', 'service', 'incident', 'process', 'system',
  // Supply chain / ops
  'order', 'fulfillment', 'warehouse', 'supply chain', 'logistics',
  'erp', 'crm', 'saas', 'cloud', 'api', 'testing',
  // Finance / business
  'finance', 'financial', 'accounting', 'audit', 'budget',
  'revenue', 'reporting', 'compliance', 'risk', 'advisory',
  'due diligence', 'valuation', 'forecasting', 'modeling',
  'excel', 'powerbi', 'tableau', 'sql', 'python',
  // Sales / marketing
  'sales', 'marketing', 'outreach', 'campaigns', 'analytics',
  // General IT
  'software', 'application', 'network', 'database', 'server',
];

export function extractKeywords(profile) {
  const skills = (profile.skills || []).map(s => s.toLowerCase().trim()).filter(Boolean);
  const headline = (profile.headline || '').toLowerCase();
  const industry = (profile.industry || '').toLowerCase();

  // ---- Primary keywords ----
  const primary = new Set();

  // Add all skills as-is
  for (const s of skills) {
    if (s.length > 2) primary.add(s);
  }

  // Add headline terms
  const headlineTerms = headline.match(/[a-z][a-z0-9/\-.]+(?:\s+[a-z][a-z0-9/\-.]+)?/g) || [];
  for (const term of headlineTerms) {
    if (term.length > 2) primary.add(term.trim());
  }

  // Add industry
  if (industry && industry.length > 2) primary.add(industry);

  // ---- Title synonym expansion (THE KEY DIFFERENCE) ----
  const titleSynonyms = new Set();
  for (const [baseTitle, synonyms] of Object.entries(TITLE_SYNONYMS)) {
    if (headline.includes(baseTitle)) {
      for (const synonym of synonyms) {
        titleSynonyms.add(synonym);
        // Also add individual words from multi-word synonyms
        for (const word of synonym.split(/\s+/)) {
          if (word.length > 2) titleSynonyms.add(word);
        }
      }
    }
  }
  // Merge synonyms into primary
  for (const s of titleSynonyms) primary.add(s);

  // ---- Expand multi-word skills into individual words ----
  const expanded = new Set();
  for (const skill of skills) {
    for (const word of skill.split(/\s+/)) {
      const clean = word.replace(/[.,;:()/\-]/g, '');
      if (clean.length > 3 && !STOP_WORDS.has(clean)) expanded.add(clean);
    }
  }

  // ---- Stem variants ----
  for (const word of [...expanded]) {
    if (STEM_MAP[word]) {
      for (const variant of STEM_MAP[word]) expanded.add(variant);
    }
  }

  // Merge expanded into primary
  const allPrimary = new Set([...primary, ...expanded]);

  // ---- Secondary keywords (domain relevance signals) ----
  const secondary = new Set();
  for (const term of DOMAIN_TERMS) {
    if (headline.includes(term) || skills.some(s => s.includes(term))) {
      secondary.add(term);
    }
  }

  // ---- Title words from headline ----
  const titleWords = new Set();
  const titleWordPattern = headline.match(/\b[a-z]{3,}\b/g) || [];
  for (const word of titleWordPattern) {
    if (!STOP_WORDS.has(word) && word.length > 2) titleWords.add(word);
  }

  return { primary: allPrimary, secondary, titleWords };
}

// ============================================
// NON-ENGLISH FILTER
// ============================================

function isNonEnglish(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const indicators = [
    'español', 'português', 'français', 'deutsch', 'italiano',
    'русский', '中文', '日本語', '한국어', 'العربية',
    'język', 'idioma', 'lingua', 'sprache',
  ];
  return indicators.some(i => text.includes(i));
}

// ============================================
// LOCAL KEYWORD SCORING (exact Python port)
// ============================================

function scoreLocally(job, primaryKw, secondaryKw, titleWords, candidateYears, candidateHeadline) {
  const title = (job.title || '').toLowerCase();
  const summary = (job.summary || '').toLowerCase();
  const combined = `${title} ${summary}`;

  let score = 0;
  const matchedPrimary = [];
  const matchedSecondary = [];

  // Primary keywords — weight by length (longer = more specific = higher signal)
  for (const kw of primaryKw) {
    if (combined.includes(kw)) {
      matchedPrimary.push(kw);
      if (kw.length > 10) score += 12;
      else if (kw.length > 6) score += 8;
      else score += 5;
    }
  }

  // Secondary keywords — bonus for domain relevance
  for (const kw of secondaryKw) {
    if (combined.includes(kw)) {
      matchedSecondary.push(kw);
      score += 2;
    }
  }

  // Title word bonus (job title alignment)
  let titleMatchCount = 0;
  for (const w of titleWords) {
    if (title.includes(w)) titleMatchCount++;
  }
  if (titleMatchCount >= 2) score += 8;
  else if (titleMatchCount === 1) score += 4;

  // ---- SENIORITY ALIGNMENT (improved — granular penalty) ----
  // Compare candidate's level to job's level
  // e.g. candidate="specialist"(1) vs job="manager"(3) → gap=2 → penalty
  const jobLevel = titleSeniorityLevel(title);
  const candidateLevel = candidateSeniorityLevel(candidateHeadline || '');

  const seniorityGap = jobLevel - candidateLevel; // positive = job is above candidate

  if (seniorityGap <= 0) {
    // Job is at or below candidate level — good fit or slight reach down
    score += 5;
  } else if (seniorityGap === 1) {
    // One level up — reasonable stretch (e.g. specialist → mid, or mid → manager)
    score += 2;
  } else if (seniorityGap === 2) {
    // Two levels up — significant stretch (e.g. specialist → manager)
    // PENALTY: reduce score substantially
    score -= 15;
  } else {
    // 3+ levels up — unrealistic (e.g. specialist → director)
    // HEAVY PENALTY
    score -= 30;
  }

  return {
    score: Math.min(score, 100),
    matchedPrimary: matchedPrimary.slice(0, 5),
    matchedSecondary: matchedSecondary.slice(0, 3),
    titleOverlap: titleMatchCount,
  };
}

// ============================================
// LLM BATCH SCORING (exact Python port)
// ============================================

async function llmBatchScore(batch, profile, candidateYears, apiKey) {
  const skills = (profile.skills || []).slice(0, 15).join(', ');
  const headline = profile.headline || 'Professional';
  const industry = profile.industry || '';

  const jobsText = batch.map((j, i) =>
    `JOB ${i + 1}:\nTitle: ${j.title || '?'}\nCompany: ${j.company || '?'}\nSummary: ${(j.summary || '').slice(0, 300)}`
  ).join('\n\n');

  const industryNote = industry ? `\n- Industry: ${industry}` : '';

  const prompt = `You are a job matching expert. Score these ${batch.length} jobs for this candidate.

Candidate profile:
- Headline: ${headline}${industryNote}
- Skills: ${skills}
- Experience: ~${candidateYears} years

Jobs to score:
${jobsText}

For each job, provide a score 0-100 based on:
- Skills match (40% weight)
- Role fit (30% weight)
- Seniority alignment (30% weight) — THIS IS CRITICAL:
  * If candidate is a "Specialist/Coordinator/Associate" and job is "Manager/Supervisor", score MUST be <50
  * If candidate is "Specialist" and job is "Director/VP/Head", score MUST be <30
  * Match the EXACT seniority tier, not just domain overlap
  * "Customer Experience Specialist" is NOT a match for "Customer Experience Manager"

CRITICAL: Return ONLY a JSON array of ${batch.length} integers, nothing else.
Example: [75, 60, 45, 90, ...]

Scores:`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    let text = (data.choices?.[0]?.message?.content || '').trim();
    text = text.replace(/^```(?:json)?\s*/g, '').replace(/\s*```$/g, '');

    const scores = JSON.parse(text);
    if (!Array.isArray(scores)) throw new Error('Not an array');

    // Pad/truncate to match batch size
    while (scores.length < batch.length) scores.push(0);
    return scores.slice(0, batch.length).map(s => Math.max(0, Math.min(100, Math.round(s))));
  } catch (e) {
    console.error('LLM scoring failed:', e.message);
    // Try fallback model
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: 200,
        }),
      });
      const data = await res.json();
      let text = (data.choices?.[0]?.message?.content || '').trim();
      text = text.replace(/^```(?:json)?\s*/g, '').replace(/\s*```$/g, '');
      const scores = JSON.parse(text);
      while (scores.length < batch.length) scores.push(0);
      return scores.slice(0, batch.length).map(s => Math.max(0, Math.min(100, Math.round(s))));
    } catch (e2) {
      console.error('Fallback model also failed:', e2.message);
      return batch.map(() => 0);
    }
  }
}

// ============================================
// COMPANY DIVERSITY (exact Python port)
// ============================================

function enforceCompanyDiversity(matches) {
  const companyCounts = {};
  return matches.filter(m => {
    const c = (m.company || 'Unknown').toLowerCase().trim();
    companyCounts[c] = (companyCounts[c] || 0) + 1;
    return companyCounts[c] <= MAX_PER_COMPANY;
  });
}

// ============================================
// COUNTRY ALIASES (exact Python port)
// ============================================

const COUNTRY_ALIASES = {
  'india': ['india', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'noida', 'gurgaon', 'gurugram', 'kolkata'],
  'united states': ['united states', 'usa', 'us-based', 'u.s.'],
  'united kingdom': ['united kingdom', 'uk', 'london', 'england'],
  'canada': ['canada', 'toronto', 'vancouver'],
  'germany': ['germany', 'berlin', 'munich', 'deutschland'],
  'australia': ['australia', 'sydney', 'melbourne'],
  'uae': ['uae', 'dubai', 'abu dhabi', 'united arab emirates'],
  'saudi arabia': ['saudi arabia', 'saudi', 'riyadh', 'jeddah', 'ksa'],
  'singapore': ['singapore'],
  'netherlands': ['netherlands', 'amsterdam', 'dutch'],
  'france': ['france', 'paris'],
  'ireland': ['ireland', 'dublin'],
};

function buildCountryAliases(preferredLoc, profileCountry, profileState) {
  const userCountry = preferredLoc.split(',').pop().trim().toLowerCase() || (profileCountry || '').toLowerCase();
  const userState = preferredLoc.includes(',')
    ? preferredLoc.split(',')[0].trim().toLowerCase()
    : (profileState || '').toLowerCase();

  // Start with known aliases for the country
  let aliases = [];
  for (const [country, countryAliases] of Object.entries(COUNTRY_ALIASES)) {
    if (country === userCountry || countryAliases.some(a => userCountry.includes(a))) {
      aliases = [...countryAliases];
      break;
    }
  }
  if (!aliases.length && userCountry) aliases.push(userCountry);

  // Add state/city specifics
  if (userState && userState !== 'any') {
    const cityMatch = userState.match(/\(([^)]+)\)/);
    if (cityMatch) {
      for (const city of cityMatch[1].split('/')) {
        const c = city.trim().toLowerCase();
        if (c && !aliases.includes(c)) aliases.push(c);
      }
    } else {
      if (!aliases.includes(userState)) aliases.push(userState);
    }
    // Known alias pairs
    if (userState === 'bangalore' && !aliases.includes('bengaluru')) aliases.push('bengaluru');
    if (userState === 'bengaluru' && !aliases.includes('bangalore')) aliases.push('bangalore');
  }

  return { userCountry, userState, countryAliases: aliases };
}

// ============================================
// DEDUPLICATION (exact Python port)
// ============================================

function deduplicateJobs(jobs) {
  const seen = new Set();
  return jobs.filter(job => {
    const key = `${(job.company || '').toLowerCase().trim()}:${(job.title || '').toLowerCase().trim()}`;
    if (key === ':' || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// MAIN MATCHING PIPELINE (exact Python port)
// ============================================

export async function matchJobs(jobs, profile, apiKeys = {}, onProgress, preferences = {}) {
  const candidateYears = estimateYears(profile);
  const { primary, secondary, titleWords } = extractKeywords(profile);

  const preferredLoc = (preferences?.location || '').toLowerCase();
  const { userCountry, userState, countryAliases } = buildCountryAliases(
    preferredLoc, profile.country, profile.state
  );

  onProgress?.(`Profile: ~${candidateYears}yr exp, ${primary.size} primary keywords, ${secondary.size} secondary, ${titleWords.size} title words`);

  // Deduplicate input
  jobs = deduplicateJobs(jobs);
  const totalUnique = jobs.length;

  onProgress?.(`Scoring ${totalUnique} unique jobs...`);

  // ---- Phase 1: Local keyword scoring (0 API calls) ----
  const scoredJobs = [];
  const filtered = { nonEnglish: 0, tooSenior: 0, lowScore: 0, passed: 0 };

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    if (onProgress && i > 0 && i % 50 === 0) {
      onProgress(`⚡ Analyzing job ${i}/${jobs.length}... (${filtered.passed} matches so far)`);
    }

    const title = job.title || '';
    const summary = job.summary || '';

    if (isNonEnglish(title, summary)) { filtered.nonEnglish++; continue; }

    // Hard seniority kill (Python: candidate_years < 3 and senior)
    if (candidateYears < 3 && titleSeniority(title) === 'senior') {
      filtered.tooSenior++;
      continue;
    }

    const local = scoreLocally(job, primary, secondary, titleWords, candidateYears, profile.headline);

    if (local.score < MATCH_THRESHOLD) {
      filtered.lowScore++;
      continue;
    }

    scoredJobs.push({ ...job, _localScore: local.score, _localDetail: local });
    filtered.passed++;
  }

  // Sort by local score
  scoredJobs.sort((a, b) => b._localScore - a._localScore);

  onProgress?.(
    `✅ Phase 1: ${filtered.passed} relevant jobs ` +
    `(filtered ${filtered.tooSenior} senior + ${filtered.lowScore} low match + ${filtered.nonEnglish} non-English)`
  );

  // Fallback: lower threshold if no matches (exact Python logic)
  if (!scoredJobs.length) {
    onProgress?.('⚠️ No matches at standard threshold — broadening search...');
    for (const job of jobs) {
      if (isNonEnglish(job.title, job.summary)) continue;
      if (candidateYears < 3 && titleSeniority(job.title) === 'senior') continue;

      const local = scoreLocally(job, primary, secondary, titleWords, candidateYears, profile.headline);
      if (local.score >= 20) {
        scoredJobs.push({ ...job, _localScore: local.score, _localDetail: local });
      }
    }
    scoredJobs.sort((a, b) => b._localScore - a._localScore);
    onProgress?.(`✅ Broadened search: ${scoredJobs.length} candidates found`);
  }

  if (!scoredJobs.length) {
    onProgress?.('❌ No relevant jobs found. Profile may be too niche for available boards.');
    return [];
  }

  // ---- Phase 2: LLM scoring for top candidates ----
  const topCandidates = scoredJobs.slice(0, MAX_LLM_CANDIDATES);
  const apiKey = apiKeys.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    onProgress?.('No OPENROUTER_API_KEY — using local scores only');
    // Still apply combined scoring logic with local only
    const localOnly = topCandidates.map(j => ({
      ...j,
      match_score: j._localScore,
    }));
    const finalLocal = localOnly.filter(j => j.match_score >= 45);
    finalLocal.sort((a, b) => b.match_score - a.match_score);
    const diverse = enforceCompanyDiversity(finalLocal);
    return diverse.slice(0, MAX_MATCHES).map(j => {
      const { _localScore, _localDetail, ...clean } = j;
      return clean;
    });
  }

  onProgress?.(`🤖 Phase 2: AI ranking top ${topCandidates.length} candidates...`);

  const allResults = [];
  let apiCalls = 0;

  for (let i = 0; i < topCandidates.length; i += LLM_BATCH_SIZE) {
    const batch = topCandidates.slice(i, i + LLM_BATCH_SIZE);
    const bn = Math.floor(i / LLM_BATCH_SIZE) + 1;
    const tb = Math.ceil(topCandidates.length / LLM_BATCH_SIZE);

    onProgress?.(`🧠 AI Batch ${bn}/${tb}: Scoring ${batch.length} jobs...`);

    const scores = await llmBatchScore(batch, profile, candidateYears, apiKey);
    apiCalls++;

    for (let j = 0; j < batch.length; j++) {
      const localScore = batch[j]._localScore;
      const llmScore = scores[j];

      // Combined score: 40% local + 60% LLM (exact Python weights)
      let combined = Math.round(localScore * 0.4 + llmScore * 0.6);

      // Source priority boost (exact Python logic)
      const source = (batch[j].source || '').toLowerCase();
      const PRIORITY_SOURCES = ['google jobs', 'indeed', 'naukri', 'linkedin', 'instahyre', 'foundit', 'glassdoor'];
      if (PRIORITY_SOURCES.some(s => source.includes(s))) {
        combined = Math.min(combined + 5, 100);
      }

      // Location boost: +8 if job mentions user's country/city (exact Python logic)
      if (userCountry && userCountry !== 'remote only') {
        const jobText = `${batch[j].title} ${batch[j].summary} ${batch[j].source} ${batch[j].location || ''}`.toLowerCase();
        if (countryAliases.some(a => jobText.includes(a))) {
          combined = Math.min(combined + 8, 100);
        }
      }

      allResults.push({
        ...batch[j],
        match_score: combined,
        _llmScore: llmScore,
      });
    }

    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    onProgress?.(`  ✓ Batch ${bn} complete - avg score: ${avgScore}%`);

    // Rate limit between batches
    if (i + LLM_BATCH_SIZE < topCandidates.length) {
      await new Promise(r => setTimeout(r, API_RATE_LIMIT));
    }
  }

  // ---- Phase 3: Filter, diversify, sort (exact Python adaptive thresholds) ----
  onProgress?.('🎯 Phase 3: Filtering and ranking final matches...');

  for (const threshold of [55, 50, 45]) {
    const matches = allResults.filter(j => j.match_score >= threshold);
    if (matches.length > 0) {
      matches.sort((a, b) => b.match_score - a.match_score);
      const diverse = enforceCompanyDiversity(matches);

      onProgress?.(`✅ ${diverse.length} matches (threshold ${threshold}%, ${apiCalls} API calls)`);

      // Clean internal fields
      return diverse.slice(0, MAX_MATCHES).map(j => {
        const { _localScore, _localDetail, _llmScore, ...clean } = j;
        return clean;
      });
    }
  }

  onProgress?.('No strong matches found');
  return [];
}
