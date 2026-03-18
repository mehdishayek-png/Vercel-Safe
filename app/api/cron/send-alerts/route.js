import { NextResponse } from 'next/server';
import { calculatePandaScore } from '@/lib/panda-matcher';
import { getAllAlertUserIds, getAlertProfile, getJobPool, getSeenJobs, markJobsSeen } from '@/lib/job-alerts';
import { sendJobAlerts } from '@/lib/email';

export const maxDuration = 60;

export async function GET(request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userIds = await getAllAlertUserIds();
        if (userIds.length === 0) {
            return NextResponse.json({ message: 'No users with alert profiles', emailsSent: 0 });
        }

        const jobPool = await getJobPool();
        if (jobPool.length === 0) {
            return NextResponse.json({ message: 'Job pool is empty', emailsSent: 0 });
        }

        console.log(`[cron/send-alerts] Processing ${userIds.length} users against ${jobPool.length} jobs in pool`);

        let emailsSent = 0;
        let errors = 0;

        for (const userId of userIds) {
            try {
                const alertProfile = await getAlertProfile(userId);
                if (!alertProfile) continue;

                // Get jobs this user hasn't seen
                const seenJobs = await getSeenJobs(userId);
                const unseenJobs = jobPool.filter(j => !seenJobs.has(j.apply_url));

                if (unseenJobs.length === 0) continue;

                // Score each unseen job against user's profile
                const profile = {
                    headline: alertProfile.headline,
                    skills: alertProfile.skills,
                    experience_years: alertProfile.experience_years,
                    location: alertProfile.location,
                };
                const preferences = {
                    country: alertProfile.country,
                    state: alertProfile.state,
                    city: alertProfile.city,
                    remoteOnly: alertProfile.remoteOnly,
                };

                const scored = [];
                for (const job of unseenJobs.slice(0, 100)) { // Cap at 100 to stay within timeout
                    try {
                        const score = await calculatePandaScore(job, profile, preferences, {});
                        if (score && score.score >= 40) { // Only include decent matches
                            scored.push({ ...job, match_score: score.score, pandaScore: score });
                        }
                    } catch {
                        // Skip jobs that fail scoring
                    }
                }

                if (scored.length === 0) continue;

                // Sort by score, take top 10
                scored.sort((a, b) => b.match_score - a.match_score);
                const topJobs = scored.slice(0, 10);

                // Get user email from Clerk
                let email, firstName;
                try {
                    // Use Clerk Backend API to get user info
                    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
                        headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` },
                    });
                    if (clerkRes.ok) {
                        const userData = await clerkRes.json();
                        email = userData.email_addresses?.[0]?.email_address;
                        firstName = userData.first_name || 'there';
                    }
                } catch {
                    continue; // Can't email without email
                }

                if (!email) continue;

                // Send alert email
                const result = await sendJobAlerts(email, firstName, topJobs, alertProfile.headline);

                if (result.success) {
                    emailsSent++;
                    // Mark these jobs as seen
                    await markJobsSeen(userId, topJobs.map(j => j.apply_url));
                }
            } catch (err) {
                errors++;
                console.error(`[cron/send-alerts] Error for user ${userId}:`, err.message);
            }
        }

        console.log(`[cron/send-alerts] Done — ${emailsSent} emails sent, ${errors} errors`);
        return NextResponse.json({ success: true, emailsSent, errors, usersProcessed: userIds.length });
    } catch (err) {
        console.error('[cron/send-alerts] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
