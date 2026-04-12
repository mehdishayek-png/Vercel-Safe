import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTokenBalance, isAdmin } from '@/lib/tokens';

export const dynamic = 'force-dynamic';
/**
 * GET /api/tokens — Returns user's token balance and usage info
 * Used by the frontend to display accurate, server-verified balances
 */
export async function GET(request) {
    try {
        const { userId } = await auth();
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
        const effectiveUserId = userId || ip;

        if (!userId) {
            const { tokens } = await getTokenBalance(effectiveUserId);
            return NextResponse.json({
                tokens,
                source: 'server',
            });
        }

        if (await isAdmin(userId)) {
            return NextResponse.json({
                tokens: 9999,
                source: 'server',
                isAdmin: true
            });
        }

        const { tokens, source } = await getTokenBalance(userId);

        return NextResponse.json({
            tokens,
            source,
        });
    } catch (error) {
        console.error('Token balance error:', error);
        return NextResponse.json({ error: 'Failed to fetch token balance' }, { status: 500 });
    }
}
