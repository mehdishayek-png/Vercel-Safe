import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { redis } from '@/lib/redis';
import { creditTokens } from '@/lib/tokens';
import { validateOrigin } from '@/lib/csrf';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request) {
    if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });

    try {
        const { userId } = await auth();

        // Rate limit: 10 attempts per 15 minutes per user/IP
        const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anon';
        const rl = await rateLimit(`razorpay-verify:${rateLimitId}`, 10, 900);
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Too many verification attempts. Please try again later.' }, { status: 429 });
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
            } catch (e) { console.error('[PAYMENT] Signature verification error:', e.message); return false; }
        })();

        if (isAuthentic) {
            // 3. Fetch the order from Razorpay to get the secure token amount
            const razorpay = new Razorpay({
                key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });
            let purchaseTokens = 60; // fallback to pro
            try {
                const orderData = await razorpay.orders.fetch(razorpay_order_id);
                if (orderData && orderData.notes && orderData.notes.tokens) {
                    purchaseTokens = parseInt(orderData.notes.tokens, 10);
                }
            } catch (err) {
                console.error('[Payment] Failed to fetch order notes. Defaulting tokens.', err.message);
            }

            // 4. Idempotency check — prevent double-crediting the same payment
            const idempotencyKey = `payment:${razorpay_payment_id}`;
            if (redis) {
                const alreadyProcessed = await redis.get(idempotencyKey);
                if (alreadyProcessed) {
                    return NextResponse.json({
                        success: true,
                        tokens: purchaseTokens,
                        balance: alreadyProcessed,
                        serverCredited: true,
                        message: "Payment already processed"
                    });
                }
            }

            // 5. Credit tokens server-side if user is authenticated
            let serverCredit = { success: false };
            if (userId) {
                serverCredit = await creditTokens(userId, purchaseTokens);
                console.log(`[Payment] Credited ${purchaseTokens} tokens to user ${userId}. New balance: ${serverCredit.balance}`);

                // Mark payment as processed (TTL 7 days)
                if (redis && serverCredit.success) {
                    await redis.set(idempotencyKey, serverCredit.balance, { ex: 7 * 86400 });
                }
            } else {
                console.warn('[Payment] Payment verified but no authenticated user — tokens will only be in localStorage');
            }

            return NextResponse.json({
                success: true,
                tokens: purchaseTokens,
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
