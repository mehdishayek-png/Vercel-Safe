import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAllJobs } from '@/lib/job-fetcher';
import { matchJobs } from '@/lib/matcher';
import { canScan, deductToken } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';
import { getFeatureFlags } from '@/lib/feature-flags';
import { preFilterJobs, validateFilters } from '@/lib/pre-filter';
import { z } from 'zod';



const ScanPayloadSchema = z.object({
  profile: z.object({
    headline: z.string().max(200, "Headline too long").optional().default(""),
    skills: z.array(z.string().max(100)).max(50, "Maximum of 50 skills allowed"),
    experience_years: z.number().min(0).max(100).optional().default(0),
    location: z.string().max(200).optional().default(""),
  }).passthrough(), // Allow other profile fields but strictly validate these
  preferences: z.object({
    midasSearch: z.boolean().optional().default(false),
    filters: z.any().optional(), // validated lower down by validateFilters
  }).passthrough().optional().default({}),
});

export async function POST(request) {
  try {
    const { userId } = await auth();

    // Rate limiting — 10 requests per minute per user
    const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rl = await rateLimit(rateLimitId, 10, 60);

    if (!rl.allowed) {
      const minutes = Math.ceil(rl.retryAfter / 60);
      return NextResponse.json({
        error: `Rate limit reached. You can search again in ${minutes} minute${minutes !== 1 ? 's' : ''}. This helps us keep Midas free for everyone.`,
        retryAfter: rl.retryAfter,
        rateLimited: true
      }, {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfter) }
      });
    }

    const rawBody = await request.json();

    // ZOD VALIDATION (Security against ReDoS / Payload bloat)
    const validationResult = ScanPayloadSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid scan payload provided.',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const { profile, preferences } = validationResult.data;

    if (!profile || !profile.skills || profile.skills.length === 0) {
      return NextResponse.json({ error: 'Profile with skills required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const effectiveUserId = userId || ip.split(',')[0].trim();

    // Server-side scan limit enforcement — applies to ALL users
    const scanCheck = await canScan(effectiveUserId, preferences?.midasSearch);
    if (!scanCheck.allowed) {
      return NextResponse.json({
        error: scanCheck.error,
        requiresAuth: scanCheck.requiresAuth || (!userId && scanCheck.paywalled),
        paywalled: !!userId && scanCheck.paywalled,
      }, { status: (scanCheck.requiresAuth || !userId) ? 401 : 403 });
    }

    // Deduct tokens (skip for admin)
    if (scanCheck.source !== 'admin') {
      const deducted = await deductToken(effectiveUserId, scanCheck.tokenCost || 1);
      if (!deducted.success) {
        return NextResponse.json({ 
            error: userId ? 'Failed to deduct token' : 'You have used your free token. Sign in to get more!',
            requiresAuth: !userId,
            paywalled: !!userId  
        }, { status: userId ? 403 : 401 });
      }
    }

    const logs = [];
    const onProgress = (msg) => logs.push(msg);

    // Fetch jobs with preferences
    const {
      jobs: allJobs,
      sources,
      queries,
      roleAnchor,
      dominantPlatform,
      source: querySource
    } = await fetchAllJobs(profile, {}, onProgress, preferences);

    // =========================================================
    // PRE-FILTER: narrows the pool before Panda sees it.
    // Safe revert: when ADVANCED_FILTERS=false this is a pure
    // passthrough — Panda gets the full unfiltered pool.
    // =========================================================
    const flags = await getFeatureFlags();
    const filterConfig = validateFilters(preferences?.filters);
    const { jobs: filteredJobs, totalBefore, totalAfter, filtersApplied, filterSummary } =
      preFilterJobs(allJobs, filterConfig, flags);

    if (filtersApplied) {
      onProgress(`🔍 Pre-filter: ${totalBefore} → ${totalAfter} jobs (${filterSummary})`);
    }

    // Pass query planner insights to matcher for enriched LLM scoring
    const enrichedPreferences = {
      ...preferences,
      roleAnchor,
      dominantPlatform,
    };

    // Match using the reliable pipeline (keyword + LLM hybrid)
    const matches = await matchJobs(filteredJobs, profile, {}, onProgress, enrichedPreferences);

    return NextResponse.json({
      matches,
      total: allJobs.length,
      totalAfterFilters: totalAfter,
      filtersApplied,
      filterSummary,
      sources,
      logs,
      queryMetadata: {
        queries,
        roleAnchor,
        dominantPlatform,
        source: querySource
      }
    });
  } catch (e) {
    console.error('Match jobs error:', e);
    return NextResponse.json({ error: 'Search failed. Please try again.' }, { status: 500 });
  }
}
