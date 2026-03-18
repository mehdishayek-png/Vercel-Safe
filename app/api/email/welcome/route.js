import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await currentUser();
        const email = user?.emailAddresses?.[0]?.emailAddress;
        const firstName = user?.firstName || 'there';

        if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 });

        const result = await sendWelcomeEmail(email, firstName);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
