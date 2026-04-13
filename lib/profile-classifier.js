import { callFlash } from './sonnet';

// Must match keys in ROLE_FAMILIES in panda-matcher.js exactly
const VALID_FAMILIES = new Set([
  'engineering', 'civil_engineering', 'cx_support', 'sales', 'data',
  'gaming', 'design', 'product', 'marketing', 'operations', 'it_infra',
  'process', 'finance', 'recruiting', 'hr', 'devrel', 'content',
  'solutions_architecture', 'product_marketing', 'legal_compliance', 'consulting',
]);

export async function classifyProfile(headline, skills) {
  if (!headline && (!skills || skills.length === 0)) return null;

  const prompt = `Classify this professional into exactly ONE primary career family and list all families that are DEFINITELY wrong for them (a recruiter would never send them these jobs).

Profile headline: "${headline || 'none'}"
Key skills: ${(skills || []).slice(0, 10).join(', ')}

Available families:
- engineering (software engineers, devops, SRE, QA engineers, SDET, mobile dev)
- data (data scientists, data engineers, ML engineers, analysts)
- product (product managers, program managers, scrum masters)
- design (UX/UI designers, graphic designers)
- sales (AE, BDR, SDR, account manager, sales engineer)
- marketing (growth, SEO, brand, content marketing)
- consulting (management consultant, deal advisory, M&A, strategy, due diligence, transaction advisory)
- finance (accountant, auditor, controller, CFO)
- cx_support (customer success, customer support, CSM)
- operations (ops manager, supply chain, logistics, procurement)
- hr (human resources, talent, people ops, recruiting)
- it_infra (IT infrastructure, network engineer, sysadmin, incident management)
- legal_compliance (legal counsel, compliance officer, paralegal)
- content (content writer, copywriter, video producer, technical writer)
- solutions_architecture (solutions architect, presales, implementation consultant)
- product_marketing (PMM, GTM, demand generation)

Respond in JSON only:
{"family":"<primary_family>","antiFamilies":["<wrong1>","<wrong2>","<wrong3>"]}`;

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('classify timeout')), 3000)
    );
    const raw = await Promise.race([
      callFlash(prompt, { maxTokens: 150, temperature: 0 }),
      timeout,
    ]);

    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');

    if (!parsed.family || !VALID_FAMILIES.has(parsed.family)) return null;

    const antiFamilies = (parsed.antiFamilies || []).filter(f => VALID_FAMILIES.has(f));

    return {
      family: parsed.family,
      antiFamilies,
    };
  } catch {
    return null;
  }
}
