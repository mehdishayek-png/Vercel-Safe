import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { creditTokens, TOKEN_PACK_SIZE } from '@/lib/tokens';
import { validateOrigin } from '@/lib/csrf';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

export async function POST(request) {
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });

    try {
        const { userId } = await auth();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await request.json();

        // 1. Recreate the signature locally using the secret
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // 2. Validate the signature matches
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // 3. Idempotency check — prevent double-crediting the same payment
            const idempotencyKey = `payment:${razorpay_payment_id}`;
            if (redis) {
                const alreadyProcessed = await redis.get(idempotencyKey);
                if (alreadyProcessed) {
                    return NextResponse.json({
                        success: true,
                        tokens: TOKEN_PACK_SIZE,
                        balance: alreadyProcessed,
                        serverCredited: true,
                        message: "Payment already processed"
                    });
                }
            }

            // 4. Credit tokens server-side if user is authenticated
            let serverCredit = { success: false };
            if (userId) {
                serverCredit = await creditTokens(userId, TOKEN_PACK_SIZE);
                console.log(`[Payment] Credited ${TOKEN_PACK_SIZE} tokens to user ${userId}. New balance: ${serverCredit.balance}`);

                // Mark payment as processed (TTL 7 days)
                if (redis && serverCredit.success) {
                    await redis.set(idempotencyKey, serverCredit.balance, { ex: 7 * 86400 });
                }
            } else {
                console.warn('[Payment] Payment verified but no authenticated user — tokens will only be in localStorage');
            }

            return NextResponse.json({
                success: true,
                tokens: TOKEN_PACK_SIZE,
                balance: serverCredit.balance || null,
                serverCredited: serverCredit.success,
                message: "Payment verified successfully"
            });
        } else {
            return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 });
        }
    } catch (error) {
        console.error('Razorpay verification error:', error);
        return NextResponse.json(
            { error: 'Failed to verify payment' },
            { status: 500 }
        );
    }
}
