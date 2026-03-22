import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const rl = await rateLimit(`neural-profile:${userId}`, 20, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const body = await request.json();
    const profile = body.profile;
    // Accept both frontend format (sliderValues: {risk, seniority, focus, culture})
    // and design format (sliders: {riskAppetite, roleSeniority, focusEquilibrium, cultureVelocity})
    const sv = body.sliderValues || body.sliders || {};
    const risk = sv.risk ?? sv.riskAppetite ?? 50;
    const seniority = sv.seniority ?? sv.roleSeniority ?? 50;
    const focus = sv.focus ?? sv.focusEquilibrium ?? 50;
    const culture = sv.culture ?? sv.cultureVelocity ?? 50;

    if (!profile) return NextResponse.json({ error: 'Profile required.' }, { status: 400 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured.' }, { status: 500 });

    const riskLabel = risk > 75 ? 'Aggressive' : risk > 40 ? 'Calculated' : 'Conservative';
    const seniorityLabel = seniority > 75 ? 'Executive/VP' : seniority > 40 ? 'Senior/Lead' : 'Mid-Level';
    const focusLabel = focus > 60 ? 'Leadership-Heavy' : focus > 35 ? 'Balanced' : 'Technical-Deep';
    const cultureLabel = culture > 70 ? 'Hyper-Growth/Startup' : culture > 40 ? 'Growth-Stage' : 'Established/Enterprise';

    const prompt = `You are a career positioning AI. Analyze how a professional's preferences affect their job match strategy.

Profile:
- Role: ${profile.headline || 'Not specified'}
- Experience: ${profile.experience_years || 'Not specified'} years
- Skills: ${(profile.skills || []).slice(0, 10).join(', ')}
- Industry: ${profile.industry || 'Not specified'}

Career Preferences:
- Risk Appetite: ${riskLabel} (${risk}/100)
- Target Seniority: ${seniorityLabel} (${seniority}/100)
- Focus: ${focusLabel} (${focus}/100)
- Culture Preference: ${cultureLabel} (${culture}/100)

Based on these preferences, return ONLY valid JSON:
{
  "ecosystemScore": 82,
  "insights": [
    {
      "title": "Insight title",
      "description": "How this preference combination affects their opportunities (1-2 sentences)",
      "impact": "positive|neutral|caution"
    }
  ],
  "topMatch": {
    "title": "Specific role title that fits these preferences",
    "company_type": "Type of company (e.g. Series B AI startup)",
    "salary_range": "$180k - $220k",
    "why": "Why this is a strong fit given their preferences (1 sentence)"
  },
  "adjustments": [
    "One specific suggestion to improve their match quality"
  ]
}

Generate 2-3 insights. ecosystemScore should reflect how well their preferences align with current market opportunities (be honest, not inflated).`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://midasmatch.com',
        'X-Title': 'Midas',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.3,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    let text = (data.choices?.[0]?.message?.content || '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Failed to parse response');

    const llmResult = JSON.parse(match[0]);

    // Map response to format the frontend expects
    const result = {
      ecosystemScore: llmResult.ecosystemScore || 50,
      insights: (llmResult.insights || []).map(i => ({
        title: i.title,
        description: i.description,
        impact: i.impact || 'neutral',
      })),
      topMatch: llmResult.topMatch ? {
        title: llmResult.topMatch.title,
        company: llmResult.topMatch.company_type || llmResult.topMatch.company || 'Target Company',
        stage: llmResult.topMatch.company_type || 'GROWTH',
        salary: llmResult.topMatch.salary_range || llmResult.topMatch.salary || '$150k - $200k',
      } : null,
      sliderValues: { risk, seniority, focus, culture },
      adjustments: llmResult.adjustments || [],
      syncedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);
  } catch (e) {
    console.error('Neural profile error:', e);
    return NextResponse.json({ error: 'Failed to analyze preferences.' }, { status: 500 });
  }
}
