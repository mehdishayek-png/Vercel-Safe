// lib/sonnet.js — Shared Claude Sonnet 4 wrapper via OpenRouter
// Used for high-quality analytical features (Deep Analysis, Career Insights, etc.)
// Falls back to Gemini Flash if Sonnet is unavailable.

const SONNET_MODEL = 'anthropic/claude-sonnet-4';
const FLASH_MODEL = 'google/gemini-2.5-flash';

export async function callSonnet(prompt, { maxTokens = 800, temperature = 0.7, fallbackToFlash = true } = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

    const referer = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://midasmatch.com');

    async function callModel(model) {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: AbortSignal.timeout(30000),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': referer,
                'X-Title': 'Midas',
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature,
                max_tokens: maxTokens,
            }),
        });

        if (!res.ok) {
            const err = await res.text().catch(() => '');
            throw new Error(`${model} returned ${res.status}: ${err.substring(0, 200)}`);
        }

        const data = await res.json();
        let content = (data.choices?.[0]?.message?.content || '').trim();
        // Strip markdown code fences
        content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
        return content;
    }

    try {
        return await callModel(SONNET_MODEL);
    } catch (e) {
        console.warn(`[SONNET] Failed: ${e.message}. ${fallbackToFlash ? 'Falling back to Flash.' : 'No fallback.'}`);
        if (fallbackToFlash) {
            return await callModel(FLASH_MODEL);
        }
        throw e;
    }
}

export function parseJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');
    return JSON.parse(match[0]);
}
