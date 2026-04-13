import { callFlash } from './sonnet';

const VALID_FAMILIES = new Set([
  'engineering', 'design', 'product', 'data', 'marketing', 'sales',
  'operations', 'hr', 'finance', 'customer_success', 'content',
  'solutions_architecture', 'product_marketing', 'legal_compliance',
  'consulting', 'cybersecurity', 'devops_cloud', 'qa',
]);

export async function classifyProfile(headline, skills) {
  if (!headline && (!skills || skills.length === 0)) return null;

  const prompt = `Classify this professional into exactly ONE primary career family and list career families that are DEFINITELY wrong for them.

Profile headline: "${headline || 'none'}"
Key skills: ${(skills || []).slice(0, 10).join(', ')}

Career families: engineering, design, product, data, marketing, sales, operations, hr, finance, customer_success, content, solutions_architecture, product_marketing, legal_compliance, consulting, cybersecurity, devops_cloud, qa

Respond in JSON only:
{"family":"<primary_family>","antiFamilies":["<wrong_family1>","<wrong_family2>"]}`;

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
