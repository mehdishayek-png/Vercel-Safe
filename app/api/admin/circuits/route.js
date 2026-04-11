import { NextResponse } from 'next/server';
import { getAllCircuitStates, resetCircuit } from '@/lib/circuit-breaker';

export async function GET() {
    return NextResponse.json(getAllCircuitStates());
}

export async function POST(request) {
    const { source } = await request.json();
    if (source) {
        resetCircuit(source);
        return NextResponse.json({ reset: source });
    }
    return NextResponse.json({ error: 'source required' }, { status: 400 });
}
