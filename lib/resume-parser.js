// lib/resume-parser.js — Parse resume PDF + extract profile via LLM

import { normalizeSkillsForSearch } from './skill-normalizer.js';

export async function parseResumePDF(pdfBuffer, apiKey) {
  console.log('Starting PDF parse...');

  try {
    console.log('Starting PDF parse with buffer size:', pdfBuffer.length);
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(pdfBuffer);
    const text = data.text || '';
    console.log('PDF text extracted, length:', text.length);

    if (!text.trim()) throw new Error('Could not extract text from PDF');

    // Use LLM to extract structured profile
    console.log('Starting LLM extraction...');
    const profile = await extractProfileWithLLM(text, apiKey);
    console.log('LLM extraction successful');
    return profile;
  } catch (e) {
    console.error('PDF Parse/LLM Error:', e);
    throw e;
  }
}

export async function extractProfileWithLLM(text, apiKey) {
  const effectiveKey = apiKey || process.env.OPENROUTER_API_KEY;
  console.log('Using API Key:', effectiveKey ? 'Yes (Present)' : 'No (Missing)');
  if (!effectiveKey) throw new Error('No OPENROUTER_API_KEY found');

  const prompt = `Extract the following from this resume and return ONLY valid JSON:

1. name: Full name of the candidate
2. headline: Current job title or professional headline (e.g. "Customer Experience Specialist" or "IT Consultant")
3. skills: List of 8-12 SHORT, ATOMIC, SEARCH-OPTIMIZED keywords. STRICT LIMIT: output 12 MAX. (see CRITICAL rules below)
4. display_skills: Same skills but formatted for UI display (Title Case where appropriate)
5. industry: The primary industry/domain (e.g. "fintech", "e-commerce", "healthcare", "SaaS")
6. search_terms: 3-5 job title variations this person would search for on job boards
7. location: The candidate's current location, in "City, State, Country" format. If unknown, return empty string.
8. experience_years: Total years of professional experience (number)
9. role_complexity: One of "basic", "operational", "strategic", "executive"
10. inferred_skills: 5-10 additional atomic domain keywords inferred from context (see rules below)

CRITICAL SKILL EXTRACTION RULES — READ VERY CAREFULLY:

Each skill MUST be 1-3 words MAX. If it's longer, BREAK IT UP or use the abbreviation.

ALWAYS use industry abbreviations over full phrases:
- "Customer Experience" → "CX"
- "Customer Success" → "CS"
- "Artificial Intelligence" → "AI"
- "Machine Learning" → "ML"
- "Single Sign-On" → "SSO"
- "Software as a Service" → "SaaS"
- "Business to Business" → "B2B"
- "Quality Assurance" → "QA"
- "Search Engine Optimization" → "SEO"
- "User Experience" → "UX"
- "Human Resources" → "HR"
- "Customer Relationship Management" → "CRM"
- "Key Performance Indicators" → "KPI"
- "Application Programming Interface" → "API"
- "Return on Investment" → "ROI"
- "Identity and Access Management" → "IAM"
- "Root Cause Analysis" → "RCA"
- "Business Intelligence" → "BI"

BREAK compound skills into individual atomic terms:
- "authentication & access resolution" → ["SSO", "authentication", "IAM"]
- "ticket workflow management" → ["ticketing", "workflow"]
- "streaming media qa" → ["streaming", "QA"]
- "ai document automation" → ["AI", "automation"]
- "cx tool ownership" → ["CX"]
- "identity troubleshooting" → ["IAM", "troubleshooting"]
- "root cause analysis" → ["RCA"]
- "technical troubleshooting" → ["troubleshooting"]
- "b2b saas" → ["B2B", "SaaS"] (split into two separate terms)
- "workflow automation" → ["automation"]
- "platform administration" → ["platform admin"]

KEEP named tools/platforms as-is (they're already atomic):
- Okta, Zendesk, Slack, Workato, Jira, Salesforce, HubSpot, Linear, Confluence, etc.
- Amazon S3, AWS, GCP, Azure, Docker, Kubernetes, etc.

SKIP generic soft skills completely — they are noise:
- "communication", "problem-solving", "collaboration", "teamwork"
- "leadership", "time management", "attention to detail"
- "cross-functional collaboration", "stakeholder communication"
- "process documentation" → just "documentation" if relevant

EXAMPLE — for a Customer Experience Specialist at a B2B SaaS company:
WRONG output: ["ai document automation", "authentication & access resolution", "b2b saas", "cx tool ownership", "identity troubleshooting", "streaming media qa", "ticket workflow management", "technical troubleshooting"]
RIGHT output: ["CX", "SaaS", "B2B", "AI", "SSO", "SAML", "Okta", "Zendesk", "Slack", "Workato", "QA", "troubleshooting", "automation", "IAM", "onboarding", "incident management", "data analysis", "monitoring"]

SEARCH_TERMS RULES:
- These are job TITLES the person would search for, not skills
- GOOD: ["Customer Experience Specialist", "SaaS CX Manager", "CX Operations Lead", "Customer Success Manager"]
- BAD: ["API integration jobs", "lead jobs"]

ROLE_COMPLEXITY RULES:
- "basic": L1 support, call center, data entry, simple ticket resolution
- "operational": team coordination, process management, standard account management
- "strategic": platform ownership, cross-functional B2B SaaS, technical integrations, AI/ML, enterprise onboarding, SSO/SAML implementation
- "executive": VP+, C-suite, board-level
- When in doubt, lean towards "strategic" if the resume mentions platform tools (Okta, Workato, Salesforce, etc.) or B2B/SaaS/enterprise context

INFERRED_SKILLS RULES:
- Based on overall resume context, infer 3-5 additional SHORT ATOMIC domain terms not explicitly listed
- USE ABBREVIATIONS: "CX", "SaaS", "B2B", NOT "customer experience", "software as a service"
- Think: "What single-word or 2-word tags would a recruiter use for this person?"
- Frame tools at the candidate's ACTUAL usage level (admin vs engineering)
- DO NOT duplicate skills already in the main skills array

Return ONLY a JSON object:
{"name": "...", "headline": "...", "skills": [...], "display_skills": [...], "industry": "...", "search_terms": [...], "experience_years": 0, "location": "...", "role_complexity": "...", "inferred_skills": [...]}

Resume text:
${text.slice(0, 6000)}

JSON:`;
  const messages = [{ role: 'user', content: prompt }];
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${effectiveKey}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://midasmatch.com',
    'X-Title': 'Midas',
  };

  let res;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      throw new Error(`Primary LLM failed with status ${res.status}`);
    }
  } catch (error) {
    console.warn('Gemini 2.5 Flash failed, attempting Mistral fallback...', error.message);
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages,
        temperature: 0,
        max_tokens: 800,
      }),
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error text');
    throw new Error(`Failed to extract profile with LLM API. Status: ${res.status}. ${errText}`);
  }

  const data = await res.json();
  let responseText = (data.choices?.[0]?.message?.content || '').trim();

  // Clean markdown fences
  responseText = responseText.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '');

  const profile = JSON.parse(responseText);

  // Validate and clean
  profile.name = profile.name || 'Candidate';
  profile.headline = profile.headline || '';
  profile.industry = profile.industry || '';
  profile.skills = Array.isArray(profile.skills)
    ? [...new Set(profile.skills.map(s => s.trim()).filter(Boolean))]
    : [];
  profile.search_terms = Array.isArray(profile.search_terms)
    ? profile.search_terms.filter(s => typeof s === 'string' && s.trim()).slice(0, 5)
    : [];
  profile.experience_years = typeof profile.experience_years === 'number' ? profile.experience_years : 0;
  profile.location = profile.location || '';

  // Merge inferred_skills into main skills array (deduplicated, preserve casing)
  const inferredSkills = Array.isArray(profile.inferred_skills)
    ? profile.inferred_skills.map(s => s.trim()).filter(Boolean)
    : [];
  if (inferredSkills.length > 0) {
    const existingLower = new Set(profile.skills.map(s => s.toLowerCase()));
    for (const inf of inferredSkills) {
      if (!existingLower.has(inf.toLowerCase())) {
        profile.skills.push(inf);
        existingLower.add(inf.toLowerCase());
      }
    }
    console.log(`Merged ${inferredSkills.length} inferred skills into profile (total: ${profile.skills.length})`);
  }

  // Preserve display_skills from LLM (or generate from skills)
  profile.display_skills = Array.isArray(profile.display_skills)
    ? profile.display_skills.filter(s => typeof s === 'string' && s.trim())
    : profile.skills.map(s => s);

  // Hard cap: max 15 skills total (beyond this is noise for both UI and matching)
  if (profile.skills.length > 15) {
    // Use the ranker to keep the 15 most impactful
    const { rankSkillsForSearch } = await import('./skill-normalizer.js');
    profile.skills = rankSkillsForSearch(profile.skills, 15);
    profile.display_skills = profile.skills.map(s => s);
  }

  if (!profile.skills || profile.skills.length === 0) {
    throw new Error('Could not extract any skills from resume. Please try a different resume or enter skills manually.');
  }

  // Generate search_keywords: atomic, short terms optimized for job API queries
  const normalized = normalizeSkillsForSearch(profile.skills);
  profile.search_keywords = normalized.keywords;
  if (normalized.dominantPlatform) {
    profile.dominant_platform = normalized.dominantPlatform;
  }
  console.log(`Generated ${profile.search_keywords.length} search keywords from ${profile.skills.length} skills:`, profile.search_keywords.slice(0, 10));

  return profile;
}
