import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const rl = await rateLimit(`voice-concierge:${userId}`, 30, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const { message, conversationHistory, profile, savedJobs, appliedJobs } = await request.json();
    if (!message) return NextResponse.json({ error: 'Message required.' }, { status: 400 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured.' }, { status: 500 });

    const recentHistory = (conversationHistory || []).slice(-6).map(m =>
      `${m.role === 'user' ? 'User' : 'Concierge'}: ${m.content || m.text || ''}`
    ).join('\n');

    const prompt = `You are the Midas Match Career Concierge — an expert AI career advisor. You help users with job search strategy, interview prep, salary negotiation, skill development, and career decisions.

User Profile:
- Role: ${profile?.headline || 'Not specified'}
- Experience: ${profile?.experience_years || 'Not specified'} years
- Skills: ${(profile?.skills || []).slice(0, 10).join(', ') || 'Not specified'}
- Industry: ${profile?.industry || 'Not specified'}
${profile?.whatIDo ? `- What they do: ${profile.whatIDo}` : ''}

Pipeline: ${(savedJobs || []).length} saved jobs, ${(appliedJobs || []).length} applications

${recentHistory ? `Recent conversation:\n${recentHistory}\n` : ''}
User's message: "${message}"

Respond with helpful, specific career advice. Return ONLY valid JSON:
{
  "response": "Your conversational response (2-4 sentences, warm but professional)",
  "suggestedActions": [
    {"label": "Action button text", "type": "link|action", "href": "/dashboard/search"}
  ],
  "insights": [
    {"title": "Insight title", "description": "Brief insight relevant to the conversation", "icon": "psychology|trending_up|event_note|lightbulb"}
  ]
}

Keep responses concise and actionable. Reference the user's actual skills and experience. Suggest specific next steps.`;

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
        temperature: 0.5,
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
    console.error('Voice concierge error:', e);
    return NextResponse.json({ error: 'Failed to generate response.' }, { status: 500 });
  }
}
