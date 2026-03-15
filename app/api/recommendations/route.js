import { auth } from '@clerk/nextjs/server';
import { fetchAllJobs } from '@/lib/job-fetcher';
import { calculatePandaScore } from '@/lib/panda-matcher';
import { learnPreferences } from '@/lib/preference-learner';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;

/**
 * GET /api/recommendations
 *
 * Returns AI-curated job recommendations based on:
 * 1. User's profile (skills, experience, title)
 * 2. Learned preferences from saved/applied jobs
 * 3. Panda-matcher scoring
 *
 * This is a lightweight endpoint — it uses cached results when possible
 * and limits to fast sources (RSS + cached SerpAPI). No tokens deducted.
 */
export async function POST(request) {
    try {
        const { userId } = await auth();

        // Rate limit: 5 recommendation requests per minute
        const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
        const rl = await rateLimit(rateLimitId + ':recs', 5, 60);

        if (!rl.allowed) {
            return Response.json(
                { error: 'Too many requests. Try again shortly.', rateLimited: true },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { profile, savedJobs, appliedJobs, preferences, apiKeys, seenJobUrls } = body;

        if (!profile || !profile.skills || profile.skills.length === 0) {
            return Response.json({ error: 'Profile with skills required' }, { status: 400 });
        }

        // Step 1: Learn preferences from user behavior
        const learned = learnPreferences({
            profile,
            savedJobs: savedJobs || [],
            appliedJobs: appliedJobs || [],
            preferences: preferences || {},
        });

        // Step 2: Build a modified profile using learned preferences
        const enrichedProfile = {
            ...profile,
            // Boost skills from engaged jobs
            skills: learned.boostSkills.length > 0
                ? [...new Set([...profile.skills, ...learned.boostSkills])]
                : profile.skills,
        };

        // Step 3: Fetch jobs using learned queries
        // Use lighter preferences — no Midas search, just standard sources
        const recPreferences = {
            ...preferences,
            midasSearch: false,
            location: preferences?.location || profile.location || '',
            remoteOnly: preferences?.remoteOnly || false,
        };

        // Override the profile's search terms with learned queries
        if (learned.queries.length > 0) {
            enrichedProfile.search_keywords = learned.queries;
        }

        const result = await fetchAllJobs(
            enrichedProfile,
            apiKeys || {},
            null, // no progress callback
            recPreferences
        );

        if (!result || !result.jobs || result.jobs.length === 0) {
            return Response.json({ recommendations: [], learned });
        }

        // Step 4: Score all jobs with panda-matcher
        const seenSet = new Set(seenJobUrls || []);
        const scoredJobs = await Promise.all(
            result.jobs
                .filter(job => {
                    // Filter out already-seen, saved, or applied jobs
                    if (!job.apply_url) return false;
                    if (seenSet.has(job.apply_url)) return false;
                    return true;
                })
                .map(async (job) => {
                    try {
                        const pandaResult = await calculatePandaScore(
                            job,
                            enrichedProfile,
                            recPreferences,
                            apiKeys || {}
                        );
                        return {
                            ...job,
                            match_score: Math.round(pandaResult.score),
                            heuristic_breakdown: pandaResult,
                        };
                    } catch {
                        return null;
                    }
                })
        );

        // Step 5: Filter by quality threshold and sort by score
        const threshold = learned.qualityThreshold || 35;
        const recommendations = scoredJobs
            .filter(j => j !== null && j.match_score >= threshold)
            .sort((a, b) => b.match_score - a.match_score)
            .slice(0, 8); // Top 8 recommendations

        // Step 6: Apply company boost for preferred companies
        if (learned.boostCompanies.length > 0) {
            recommendations.forEach(job => {
                const company = (job.company || '').toLowerCase();
                if (learned.boostCompanies.some(bc => company.includes(bc))) {
                    job._boosted = true;
                }
            });
        }

        return Response.json({
            recommendations,
            learned: {
                queriesUsed: learned.queries,
                hasEnoughData: learned.hasEnoughData,
                engagementCount: learned.engagementCount,
                topTitleKeywords: learned.topTitleKeywords,
                qualityThreshold: threshold,
            },
        });
    } catch (err) {
        console.error('[RECOMMENDATIONS]', err);
        return Response.json(
            { error: err.message || 'Failed to generate recommendations' },
            { status: 500 }
        );
    }
}
