import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTokenBalance, getDailyScanCount, getDeepScanCount, FREE_DAILY_SCANS, FREE_DEEP_SCANS } from '@/lib/tokens';

/**
 * GET /api/tokens — Returns user's token balance and usage info
 * Used by the frontend to display accurate, server-verified balances
 */
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            // Anonymous users get local-only defaults
            return NextResponse.json({
                tokens: 0,
                dailyScansUsed: 0,
                deepScansUsed: 0,
                freeDailyScans: FREE_DAILY_SCANS,
                freeDeepScans: FREE_DEEP_SCANS,
                source: 'anonymous',
            });
        }

        const { tokens, source } = await getTokenBalance(userId);
        const dailyScansUsed = await getDailyScanCount(userId);
        const deepScansUsed = await getDeepScanCount(userId);

        return NextResponse.json({
            tokens,
            dailyScansUsed,
            deepScansUsed,
            freeDailyScans: FREE_DAILY_SCANS,
            freeDeepScans: FREE_DEEP_SCANS,
            source,
        });
    } catch (error) {
        console.error('Token balance error:', error);
        return NextResponse.json({ error: 'Failed to fetch token balance' }, { status: 500 });
    }
}
