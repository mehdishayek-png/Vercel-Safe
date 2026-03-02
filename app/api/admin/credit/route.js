import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { isAdmin, creditTokens } from '@/lib/tokens';

export async function POST(req) {
    try {
        const { userId } = await auth();

        // Ensure the requester is an admin
        if (!userId || !(await isAdmin(userId))) {
            return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
        }

        const body = await req.json();
        const { email, amount } = body;

        if (!email || !amount || parseInt(amount, 10) <= 0) {
            return NextResponse.json({ error: 'Email and valid amount required' }, { status: 400 });
        }

        // Look up the requested user by email in Clerk
        const client = await clerkClient();
        const response = await client.users.getUserList({ emailAddress: [email.toLowerCase()] });

        // Handle Clerk v6 response structure ({ data: [...] })
        const users = response.data || response;

        if (!users || users.length === 0) {
            return NextResponse.json({ error: `User with email ${email} not found in Clerk.` }, { status: 404 });
        }

        const targetUserId = users[0].id;

        // Credit tokens in Redis
        const result = await creditTokens(targetUserId, parseInt(amount, 10));

        if (!result.success) {
            return NextResponse.json({ error: 'Failed to credit tokens in database' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully credited ${amount} tokens to ${email}`,
            newBalance: result.balance
        });

    } catch (error) {
        console.error('Admin Credit Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
