import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';
import { callSonnet, parseJSON } from '@/lib/sonnet';
import { deductToken, isAdmin } from '@/lib/tokens';

export const maxDuration = 20;

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Sign in to generate negotiation playbooks', requiresAuth: true }, { status: 401 });
    }

    const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rl = await rateLimit(`salary-negotiation:${rateLimitId}`, 10, 3600);
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit reached, try again later' }, { status: 429, headers: { 'Retry-After': rl.retryAfter } });

    // Deduct 1 Token for AI generation
    const adminUser = await isAdmin(userId);
    if (!adminUser) {
        const tokenCheck = await deductToken(userId, 1);
        if (!tokenCheck.success) {
            return NextResponse.json({ error: tokenCheck.error || 'Please top up your tokens to generate negotiation playbooks', paywalled: true }, { status: 403 });
        }
    }

    const { job, profile, analysis } = await request.json();

    if (!job || !profile) {
      return NextResponse.json({ error: 'Job and profile are required' }, { status: 400 });
    }

    const jobSummary = [
      `Title: ${job.title || '?'}`,
      `Company: ${job.company || '?'}`,
      `Location: ${job.location || 'N/A'}`,
      `Salary: ${job.salary || 'Not posted'}`,
      `Description: ${(job.description || job.summary || '').slice(0, 1500)}`,
    ].join('\n');

    const profileSummary = [
      `Headline: ${profile.headline || 'N/A'}`,
      `Skills: ${(profile.skills || []).slice(0, 20).join(', ')}`,
      `Experience: ${profile.experience_years || profile.experience || 'N/A'} years`,
      `Location: ${profile.location || 'N/A'}`,
    ].join('\n');

    const analysisContext = analysis?.verdict
      ? `\nDEEP ANALYSIS VERDICT: ${analysis.verdict}`
      : '';

    const prompt = `You are a tech recruiting veteran who has negotiated 500+ offers. Coach the candidate.

Rules:
- Scripts must use natural conversational language, not corporate speak.
- Base numbers on job's posted salary, user's experience, and market. Never inflate beyond 20% above realistic range.

JOB:
${jobSummary}

CANDIDATE PROFILE:
${profileSummary}${analysisContext}

Respond with ONLY valid JSON in this exact format:
{
  "market_context": "2-3 sentences on what this role typically pays in this market",
  "your_position": "2 sentences on leverage level",
  "strategy": {
    "timing": "when to discuss salary",
    "anchor": "$X and why",
    "floor": "$Y walk-away number",
    "scripts": [
      { "scenario": "They ask your expectations first", "say_this": "exact words" },
      { "scenario": "They offer below your target", "say_this": "exact words" },
      { "scenario": "They say budget is fixed", "say_this": "exact words" }
    ],
    "non_salary_levers": ["remote flexibility", "signing bonus", "etc"]
  }
}`;

    const raw = await callSonnet(prompt, { maxTokens: 800, temperature: 0.7 });
    const result = parseJSON(raw);

    return NextResponse.json(result);
  } catch (e) {
    console.error('Salary negotiation error:', e);
    return NextResponse.json({ error: 'Failed to generate negotiation playbook. Please try again.' }, { status: 500 });
  }
}
