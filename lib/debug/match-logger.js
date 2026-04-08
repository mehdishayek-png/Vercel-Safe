/**
 * Match Logger — captures every scored job with full context for offline debugging.
 *
 * Local mode (Node, no Vercel): appends JSONL to logs/matches/YYYY-MM-DD.jsonl.
 * Production mode (Vercel runtime): POSTs to /api/debug/match-logs ring buffer.
 *
 * Each entry is self-contained — full profile snapshot embedded so logs are
 * grep-able without cross-references.
 *
 * Usage:
 *   import { logMatch } from '@/lib/debug/match-logger';
 *   await logMatch({
 *     stage: 'list_score',          // 'list_score' | 'detail_view'
 *     profile,                       // full user profile
 *     job,                           // full job object
 *     pandaScore,                    // number
 *     pandaBreakdown,                // _localDetail object from panda-matcher
 *     llmScore,                      // batch LLM score (or null)
 *     aiVerdict,                     // analyze-job response (or null)
 *     combinedScore,                 // final combined number
 *   });
 */

const isNode = typeof process !== 'undefined' && process.versions?.node && !process.env.VERCEL;

let fsPromises;
let path;
if (isNode) {
    // Lazy-load so this module is safe to import from edge/runtime contexts
    try {
        fsPromises = await import('node:fs/promises');
        path = await import('node:path');
    } catch {
        // ignore — we'll fall through to the HTTP path
    }
}

function todayStamp() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function buildEntry(input) {
    const {
        stage,
        profile,
        job,
        pandaScore,
        pandaBreakdown,
        llmScore,
        aiVerdict,
        combinedScore,
        notes,
    } = input;

    const aiFitScore = aiVerdict?.fit_score ?? llmScore ?? null;
    const disagreement =
        pandaScore != null && aiFitScore != null
            ? Math.abs(Math.round(pandaScore) - Math.round(aiFitScore))
            : null;

    return {
        ts: new Date().toISOString(),
        stage: stage || 'unknown',
        disagreement,
        scores: {
            panda: pandaScore != null ? Math.round(pandaScore) : null,
            llm_batch: llmScore != null ? Math.round(llmScore) : null,
            ai_verdict: aiFitScore != null ? Math.round(aiFitScore) : null,
            combined: combinedScore != null ? Math.round(combinedScore) : null,
        },
        profile: profile
            ? {
                  user_id: profile.user_id || profile.id || null,
                  headline: profile.headline || null,
                  experience_years: profile.experience_years ?? null,
                  skills: Array.isArray(profile.skills) ? profile.skills : [],
                  whatIDo: profile.whatIDo || profile.what_i_do || null,
                  location: profile.location || null,
                  preferences: profile.preferences || null,
                  search_strategy: profile.search_strategy || null,
              }
            : null,
        job: job
            ? {
                  id: job.id || null,
                  title: job.title || null,
                  company: job.company || null,
                  location: job.location || null,
                  source: job.source || null,
                  date_posted: job.date_posted || null,
                  apply_url: job.apply_url || null,
                  summary: job.summary || job.description || null,
              }
            : null,
        panda_breakdown: pandaBreakdown || null,
        ai_verdict: aiVerdict || null,
        notes: notes || null,
    };
}

async function writeLocal(entry) {
    if (!fsPromises || !path) return false;
    try {
        const dir = path.resolve(process.cwd(), 'logs', 'matches');
        await fsPromises.mkdir(dir, { recursive: true });
        const file = path.join(dir, `${todayStamp()}.jsonl`);
        await fsPromises.appendFile(file, JSON.stringify(entry) + '\n', 'utf8');
        return true;
    } catch (err) {
        // Never let logging break a scan
        if (process.env.DEBUG_MATCH_LOGGER) {
            console.warn('[match-logger] local write failed:', err.message);
        }
        return false;
    }
}

async function writeRemote(entry) {
    // In Vercel runtime — push to in-memory ring buffer endpoint
    try {
        const base = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';
        await fetch(`${base}/api/debug/match-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
            // Fire-and-forget — don't slow down scans
            signal: AbortSignal.timeout(2000),
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Main entry point. Never throws — failures are silent.
 */
export async function logMatch(input) {
    if (process.env.DISABLE_MATCH_LOGGER === '1') return;
    try {
        const entry = buildEntry(input);
        if (process.env.VERCEL) {
            await writeRemote(entry);
        } else {
            await writeLocal(entry);
        }
    } catch {
        // swallow — logging is best-effort
    }
}

export { buildEntry };
