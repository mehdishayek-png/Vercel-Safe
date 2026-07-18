const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']);

/**
 * Run an Apify Actor inside the search latency and spend budget.
 * If the wait budget expires, abort the run and retain whatever it already
 * pushed to its dataset instead of discarding partial value or paying for work
 * that can no longer reach the user.
 */
export async function runActorWithinBudget(client, actorId, input, {
    waitSecs = 42,
    runTimeoutSecs = 48,
    maxItems = 30,
    maxTotalChargeUsd,
} = {}) {
    const run = await client.actor(actorId).call(input, {
        waitSecs,
        timeout: runTimeoutSecs,
        maxItems,
        maxTotalChargeUsd,
        log: null,
    });

    const exceededWaitBudget = !TERMINAL_STATUSES.has(run.status);
    if (exceededWaitBudget) {
        await client.run(run.id).abort().catch(() => null);
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: maxItems });
    return {
        items,
        status: exceededWaitBudget ? 'ABORTED_BY_SEARCH_BUDGET' : run.status,
        partial: exceededWaitBudget || run.status !== 'SUCCEEDED',
        runId: run.id,
    };
}

export function normalizeActorLocation(location, { cityOnly = false } = {}) {
    const value = String(location || '').replace(/\s+/g, ' ').trim();
    if (!value) return '';
    if (/\bremote\b/i.test(value)) return 'Remote';

    const parts = value.split(',').map(part => part.trim()).filter(Boolean);
    if (cityOnly) return parts[0] || value;
    return parts.slice(0, 3).join(', ');
}
