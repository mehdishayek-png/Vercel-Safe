import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();
        const { message, stack, componentStack, url, timestamp, userAgent } = body;

        // This will show up in Vercel Runtime Logs
        console.error('[CLIENT CRASH]', JSON.stringify({
            message,
            url,
            timestamp,
            stack: stack?.slice(0, 500),
            component: componentStack?.slice(0, 300),
            ua: userAgent?.slice(0, 100),
        }));

        return NextResponse.json({ logged: true });
    } catch (e) {
        return NextResponse.json({ logged: false }, { status: 400 });
    }
}
