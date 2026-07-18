import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAllCircuitStates, resetCircuit } from '@/lib/circuit-breaker';
import { isAdmin } from '@/lib/tokens';
import { validateOrigin } from '@/lib/csrf';

async function authorize() {
    const { userId } = await auth();
    return userId && await isAdmin(userId);
}

export async function GET() {
    if (!(await authorize())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(getAllCircuitStates());
}

export async function POST(request) {
    if (!(await authorize())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    const { source } = await request.json();
    if (source) {
        resetCircuit(source);
        return NextResponse.json({ reset: source });
    }
    return NextResponse.json({ error: 'source required' }, { status: 400 });
}
