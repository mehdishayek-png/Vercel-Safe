// lib/resume-parser.js — Parse resume PDF + extract profile via LLM

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

SEARCH_TERMS RULES:
- These are job TITLES the person would search for, not skills
- Think: what would this person type into LinkedIn/Indeed/Naukri?
- GOOD: ["Business Operations Manager", "Fintech Operations Lead", "Payment Operations Manager", "Operations Manager fintech"]
- BAD: ["API integration jobs", "lead jobs"] (too vague)

Return ONLY a JSON object:
{"name": "...", "headline": "...", "skills": [...], "industry": "...", "search_terms": [...]}

Resume text:
${text.slice(0, 6000)}

JSON:`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${effectiveKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 600,
    }),
  });

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

  if (!profile.skills || profile.skills.length === 0) {
    throw new Error('Could not extract any skills from resume. Please try a different resume or enter skills manually.');
  }

  return profile;
}
