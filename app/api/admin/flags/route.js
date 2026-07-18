// =============================================================================
// POST /api/admin/flags — Toggle feature flags at runtime (no redeploy)
// GET  /api/admin/flags — Read current flag state
// =============================================================================
// Usage:
//   curl -X POST /api/admin/flags \
//     -H "Authorization: Bearer <clerk_token>" \
//     -d '{ "flag": "ADVANCED_FILTERS", "value": false }'
//
// Set value to null to clear the Redis override and revert to env/default.
// Setting ADVANCED_FILTERS=false cascades and forces all sub-flags off.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { setFlagOverride, clearFlagOverride, getFeatureFlags } from '@/lib/feature-flags';
import { isAdmin } from '@/lib/tokens';
import { validateOrigin } from '@/lib/csrf';

const VALID_FLAGS = ['ADVANCED_FILTERS', 'SALARY_FILTER', 'COMPANY_SIZE_FILTER', 'MULTI_REGION'];

// ---------------------------------------------------------------------------
// GET — Read current flag state
// ---------------------------------------------------------------------------

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const flags = await getFeatureFlags();
    return NextResponse.json({ flags });
}

// ---------------------------------------------------------------------------
// POST — Set or clear a flag override
// ---------------------------------------------------------------------------

export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!VALID_FLAGS.includes(body.flag)) {
        return NextResponse.json(
            { error: `Invalid flag. Valid: ${VALID_FLAGS.join(', ')}` },
            { status: 400 }
        );
    }

    if (body.value === null || body.value === undefined) {
        // Clear override → revert to env var / hardcoded default
        await clearFlagOverride(body.flag);
    } else {
        await setFlagOverride(body.flag, Boolean(body.value));
    }

    const flags = await getFeatureFlags();
    return NextResponse.json({ updated: body.flag, value: body.value, currentState: flags });
}
