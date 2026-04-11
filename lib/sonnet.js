// lib/sonnet.js — Shared LLM wrappers via OpenRouter
// callSonnet: high-quality analytical features (Deep Analysis, Salary Negotiation)
// callFlash: structured/comparative tasks (Career Insights, Resume Gaps)

const SONNET_MODEL = 'anthropic/claude-sonnet-4';
const FLASH_MODEL = 'google/gemini-2.5-flash';

// callSonnet now routes directly to Flash — Sonnet was too slow (12-25s per call)
// and caused 504 timeouts on Vercel when batching 10-20 analyze-job calls.
export async function callSonnet(prompt, { maxTokens = 800, temperature = 0.7 } = {}) {
    return callFlash(prompt, { maxTokens, temperature });
}

export async function callFlash(prompt, { maxTokens = 800, temperature = 0.7 } = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

    const referer = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://midasmatch.com');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(25000),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': referer,
            'X-Title': 'Midas',
        },
        body: JSON.stringify({
            model: FLASH_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens,
        }),
    });

    if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`Flash returned ${res.status}: ${err.substring(0, 200)}`);
    }

    const data = await res.json();
    let content = (data.choices?.[0]?.message?.content || '').trim();
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
    return content;
}

export function parseJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');
    return JSON.parse(match[0]);
}
