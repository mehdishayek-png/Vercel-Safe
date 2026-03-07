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
2. headline: Current job title or professional headline (e.g. "Business Operations Lead" or "IT Consultant")
3. skills: List of 8-15 SPECIFIC, SEARCHABLE professional skills that a recruiter would use as keywords
4. industry: The primary industry/domain (e.g. "fintech", "e-commerce", "healthcare", "SaaS")
5. search_terms: 3-5 job title variations this person would search for on job boards
6. location: The candidate's current location, in "City, State, Country" format (e.g., "Bangalore, Karnataka, India" or "San Francisco, CA, USA"). If unknown, return empty string.

SKILLS RULES — read carefully:
- Extract DOMAIN-SPECIFIC skills, NOT generic ones
- GOOD examples: "payment gateway integration", "UPI services", "merchant onboarding", "digital payments", "fintech operations", "loyalty programs", "gift card management", "prepaid cards", "BBPS", "order fulfillment", "vendor management"
- BAD examples: "ai modules", "api mappings", "aeps", "modules" (too vague/niche to match job postings)
- Include specific tools/platforms: "Salesforce", "JIRA", "SAP", "REST API"
- Include specific methodologies: "Agile", "process automation", "reconciliation"
- DO NOT include soft skills: "communication", "leadership", "problem solving", "teamwork"
- DO NOT include generic office tools: "Microsoft Office", "Excel", "PowerPoint", "Word"
- DO NOT include languages spoken
- Each skill should realistically appear in a job posting the candidate would apply to
49: 
50: EXPERIENCE RULES:
51: - Calculate total years of professional experience (excluding internships if > 2 years full-time)
52: - Return a NUMBER (e.g., 5, 2.5, 0)
53: - If not explicitly stated, estimate based on graduation year or work history start date

SEARCH_TERMS RULES:
- These are job TITLES the person would search for, not skills
- Think: what would this person type into LinkedIn/Indeed/Naukri?
- GOOD: ["Business Operations Manager", "Fintech Operations Lead", "Payment Operations Manager", "Operations Manager fintech"]
- BAD: ["API integration jobs", "lead jobs"] (too vague)

ROLE_COMPLEXITY RULES:
- Classify the candidate's role depth as ONE of: "basic", "operational", "strategic", "executive"
- "basic": L1 support, call center, data entry, simple ticket resolution
- "operational": team coordination, process management, standard account management
- "strategic": platform ownership, cross-functional B2B SaaS, technical integrations, AI/ML, enterprise onboarding, SSO/SAML implementation
- "executive": VP+, C-suite, board-level
- When in doubt, lean towards "strategic" if the resume mentions platform tools (Okta, Workato, Salesforce, etc.) or B2B/SaaS/enterprise context

INFERRED_SKILLS RULES — THIS IS CRITICAL:
- Based on the OVERALL resume context, infer 5-10 additional industry/domain terms that describe this person's work environment and role, even if not explicitly written on the resume.
- Think: "What would a recruiter TAG this profile with on LinkedIn?"
- INCLUDE industry context: "b2b", "saas", "enterprise software", "fintech", "healthtech", etc.
- INCLUDE role-adjacent domain terms: "customer onboarding", "platform administration", "saas support operations", "cx tool ownership", "enterprise customer management"
- IMPORTANT: Frame tools at the candidate's ACTUAL usage level, NOT the engineering level.
  - If someone USES Okta to unlock accounts/troubleshoot → infer "okta administration", "identity troubleshooting", NOT "okta engineering" or "IAM architecture"
  - If someone USES Zendesk daily as their CX platform → infer "zendesk administration", "cx platform management", "ticket workflow management"
  - If someone CONFIGURES Workato integrations → infer "workflow automation", "integration management"
- DO NOT duplicate skills already in the main skills array
- These should be terms that would appear in job postings this person SHOULD apply to

Return ONLY a JSON object:
{"name": "...", "headline": "...", "skills": [...], "industry": "...", "search_terms": [...], "experience_years": 0, "location": "...", "role_complexity": "...", "inferred_skills": [...]}

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
    ? [...new Set(profile.skills.map(s => s.trim().toLowerCase()).filter(Boolean))].sort()
    : [];
  profile.search_terms = Array.isArray(profile.search_terms)
    ? profile.search_terms.filter(s => typeof s === 'string' && s.trim()).slice(0, 5)
    : [];
  profile.experience_years = typeof profile.experience_years === 'number' ? profile.experience_years : 0;
  profile.location = profile.location || '';

  // Merge inferred_skills into main skills array (deduplicated)
  const inferredSkills = Array.isArray(profile.inferred_skills)
    ? profile.inferred_skills.map(s => s.trim().toLowerCase()).filter(Boolean)
    : [];
  if (inferredSkills.length > 0) {
    const allSkills = new Set([...profile.skills, ...inferredSkills]);
    profile.skills = [...allSkills].sort();
    console.log(`Merged ${inferredSkills.length} inferred skills into profile (total: ${profile.skills.length})`);
  }

  if (!profile.skills || profile.skills.length === 0) {
    throw new Error('Could not extract any skills from resume. Please try a different resume or enter skills manually.');
  }

  // Generate search_keywords: atomic, short terms optimized for job API queries
  profile.search_keywords = normalizeSkillsForSearch(profile.skills);
  console.log(`Generated ${profile.search_keywords.length} search keywords from ${profile.skills.length} skills:`, profile.search_keywords.slice(0, 10));

  return profile;
}
