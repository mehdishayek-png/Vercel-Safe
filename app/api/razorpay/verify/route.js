import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Redis } from '@upstash/redis';
import { creditTokens, TOKEN_PACK_SIZE } from '@/lib/tokens';
import { validateOrigin } from '@/lib/csrf';

const EXPECTED_AMOUNT_PAISE = 399 * 100;

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

export async function POST(request) {
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });

    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Authentication required to verify payment' }, { status: 401 });
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await request.json();

        // Validate required fields are non-empty strings
        if (
            typeof razorpay_order_id !== 'string' || !razorpay_order_id.trim() ||
            typeof razorpay_payment_id !== 'string' || !razorpay_payment_id.trim() ||
            typeof razorpay_signature !== 'string' || !razorpay_signature.trim()
        ) {
            return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
        }

        // 1. Recreate the signature locally using the secret
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // 2. Validate the signature matches (timing-safe)
        const isAuthentic = (() => {
            try {
                return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(razorpay_signature, 'hex'));
            } catch { return false; }
        })();

        if (isAuthentic) {
            // 3. Verify order amount matches expected price (prevent amount tampering)
            try {
                const razorpay = new Razorpay({
                    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET,
                });
                const order = await razorpay.orders.fetch(razorpay_order_id);
                if (order.amount !== EXPECTED_AMOUNT_PAISE || order.currency !== 'INR') {
                    console.error(`[Payment] Amount mismatch: expected ${EXPECTED_AMOUNT_PAISE} INR, got ${order.amount} ${order.currency}`);
                    return NextResponse.json({ success: false, message: 'Payment amount mismatch' }, { status: 400 });
                }
            } catch (fetchErr) {
                console.error('[Payment] Failed to verify order amount:', fetchErr.message);
                return NextResponse.json({ error: 'Could not verify payment amount' }, { status: 500 });
            }

            // 4. Idempotency check — prevent double-crediting the same payment
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

            // 4. Credit tokens server-side
            let serverCredit = { success: false };
            serverCredit = await creditTokens(userId, TOKEN_PACK_SIZE);
            console.log(`[Payment] Credited ${TOKEN_PACK_SIZE} tokens to user ${userId}. New balance: ${serverCredit.balance}`);

            // Mark payment as processed (TTL 7 days)
            if (redis && serverCredit.success) {
                await redis.set(idempotencyKey, serverCredit.balance, { ex: 7 * 86400 });
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
