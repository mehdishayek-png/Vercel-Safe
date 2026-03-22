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

    const { profile, sliders } = await request.json();
    if (!profile) return NextResponse.json({ error: 'Profile required.' }, { status: 400 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured.' }, { status: 500 });

    const riskLabel = sliders?.riskAppetite > 75 ? 'Aggressive' : sliders?.riskAppetite > 40 ? 'Calculated' : 'Conservative';
    const seniorityLabel = sliders?.roleSeniority > 75 ? 'Executive/VP' : sliders?.roleSeniority > 40 ? 'Senior/Lead' : 'Mid-Level';
    const focusLabel = sliders?.focusEquilibrium > 60 ? 'Leadership-Heavy' : sliders?.focusEquilibrium > 35 ? 'Balanced' : 'Technical-Deep';
    const cultureLabel = sliders?.cultureVelocity > 70 ? 'Hyper-Growth/Startup' : sliders?.cultureVelocity > 40 ? 'Growth-Stage' : 'Established/Enterprise';

    const prompt = `You are a career positioning AI. Analyze how a professional's preferences affect their job match strategy.

Profile:
- Role: ${profile.headline || 'Not specified'}
- Experience: ${profile.experience_years || 'Not specified'} years
- Skills: ${(profile.skills || []).slice(0, 10).join(', ')}
- Industry: ${profile.industry || 'Not specified'}

Career Preferences:
- Risk Appetite: ${riskLabel} (${sliders?.riskAppetite || 50}/100)
- Target Seniority: ${seniorityLabel} (${sliders?.roleSeniority || 50}/100)
- Focus: ${focusLabel} (${sliders?.focusEquilibrium || 50}/100)
- Culture Preference: ${cultureLabel} (${sliders?.cultureVelocity || 50}/100)

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

    const result = JSON.parse(match[0]);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Neural profile error:', e);
    return NextResponse.json({ error: 'Failed to analyze preferences.' }, { status: 500 });
  }
}
