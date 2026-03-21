import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAllJobs } from '@/lib/job-fetcher';
import { matchJobs } from '@/lib/matcher';
import { canScan, incrementDailyScan, deductToken, incrementAnonymousScan } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';
import { getFeatureFlags } from '@/lib/feature-flags';
import { preFilterJobs, validateFilters } from '@/lib/pre-filter';
import { z } from 'zod';

export const maxDuration = 90; // Generous enough for batching, tight enough to catch hangs

const ScanPayloadSchema = z.object({
  profile: z.object({
    headline: z.string().max(200, "Headline too long").optional().default(""),
    skills: z.array(z.string().max(100)).max(50, "Maximum of 50 skills allowed"),
    experience_years: z.number().min(0).max(100).optional().default(0),
    location: z.string().max(200).optional().default(""),
  }).passthrough(),
  preferences: z.object({
    midasSearch: z.boolean().optional().default(false),
    filters: z.any().optional(),
  }).optional().default({}),
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

    // Server-side scan limit enforcement — applies to ALL users
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    const scanCheck = await canScan(userId, preferences?.midasSearch, ip);
    if (!scanCheck.allowed) {
      return NextResponse.json({
        error: scanCheck.error,
        requiresAuth: scanCheck.requiresAuth || false,
        paywalled: !scanCheck.requiresAuth,
      }, { status: scanCheck.requiresAuth ? 401 : 403 });
    }

    // Track anonymous scans by IP
    if (scanCheck.trackAnonymous && scanCheck.anonymousIp) {
      await incrementAnonymousScan(scanCheck.anonymousIp);
    }

    // Pre-check: if paid scan, verify balance before starting
    if (!scanCheck.adminPass && !scanCheck.isFree) {
      const { getTokenBalance } = await import('@/lib/tokens');
      const balance = await getTokenBalance(userId);
      if (balance < (scanCheck.tokenCost || 1)) {
        return NextResponse.json({ error: 'Insufficient token balance' }, { status: 403 });
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

    // Deduct tokens/increment counters AFTER successful work
    if (!scanCheck.adminPass) {
      try {
        if (scanCheck.isFree) {
          if (scanCheck.isMidasSearchFree) {
            await import('@/lib/tokens').then(m => m.incrementWeeklyMidasScan(userId));
          } else {
            await incrementDailyScan(userId);
          }
        } else {
          await deductToken(userId, scanCheck.tokenCost || 1);
        }
      } catch (deductErr) {
        console.error('Post-search token deduction error:', deductErr);
      }
    }

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
