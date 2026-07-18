import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf';
import { rateLimit } from '@/lib/rate-limit';

const ClientErrorSchema = z.object({
    message: z.string().max(500).default('Unknown error'),
    stack: z.string().max(4000).optional().default(''),
    componentStack: z.string().max(2000).optional().default(''),
    url: z.string().max(1000).optional().default(''),
    timestamp: z.string().max(100).optional().default(''),
    userAgent: z.string().max(500).optional().default(''),
});

export async function POST(req) {
    try {
        if (!validateOrigin(req)) return NextResponse.json({ logged: false }, { status: 403 });
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const limit = await rateLimit(`client-error:${ip}`, 20, 60);
        if (!limit.allowed) return NextResponse.json({ logged: false }, { status: 429 });

        const parsed = ClientErrorSchema.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({ logged: false }, { status: 400 });
        const { message, stack, componentStack, url, timestamp, userAgent } = parsed.data;

        // Sentry handles primary reporting; this remains a bounded Railway log fallback.
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
