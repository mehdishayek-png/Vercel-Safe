import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 20;

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const rl = await rateLimit(`network-pulse:${userId}`, 15, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const { profile, savedJobs, appliedJobs } = await request.json();
    if (!profile) return NextResponse.json({ error: 'Profile required.' }, { status: 400 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured.' }, { status: 500 });

    // Build real company clusters from actual data
    const companyFrequency = {};
    [...(savedJobs || []), ...(appliedJobs || [])].forEach(job => {
      const company = job.company || job.job_company;
      if (company) companyFrequency[company] = (companyFrequency[company] || 0) + 1;
    });
    const topCompanies = Object.entries(companyFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count} roles)`);

    const prompt = `You are a career networking strategist. Analyze this professional's positioning and generate actionable networking advice.

Professional Profile:
- Role: ${profile.headline || 'Not specified'}
- Experience: ${profile.experience_years || 'Not specified'} years
- Skills: ${(profile.skills || []).slice(0, 10).join(', ')}
- Industry: ${profile.industry || 'Not specified'}
${profile.whatIDo ? `- Focus: ${profile.whatIDo}` : ''}

Their Job Search Activity:
- ${(savedJobs || []).length} saved jobs
- ${(appliedJobs || []).length} applications
- Top target companies: ${topCompanies.join(', ') || 'None yet'}

Generate a networking strategy. Return ONLY valid JSON:
{
  "thoughtLeadership": {
    "score": 65,
    "tier": "Growing|Established|Influential",
    "summary": "One sentence about their professional visibility"
  },
  "strategies": [
    {
      "title": "Strategy title (specific, actionable)",
      "description": "Why this matters and how to execute it (2 sentences)",
      "priority": "high|medium",
      "platform": "LinkedIn|Twitter|Industry Events|Direct Outreach"
    }
  ],
  "contentIdeas": [
    "Specific post/article topic they could write about based on their expertise"
  ],
  "targetConnections": [
    {
      "roleType": "e.g. Engineering Manager at [target company]",
      "reason": "Why connecting with this person type helps",
      "approach": "How to reach out"
    }
  ]
}

Generate 2-3 strategies, 2-3 content ideas, and 2 target connection types. Be specific to their industry and skills.`;

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
        temperature: 0.4,
        max_tokens: 1200,
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

    // Attach real company data (not fabricated)
    result.companyClusters = topCompanies;
    result.activityStats = {
      savedCount: (savedJobs || []).length,
      appliedCount: (appliedJobs || []).length,
      uniqueCompanies: Object.keys(companyFrequency).length,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error('Network pulse error:', e);
    return NextResponse.json({ error: 'Failed to analyze network.' }, { status: 500 });
  }
}
