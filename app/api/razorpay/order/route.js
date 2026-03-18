import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

export async function POST(request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!validateOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });

        // Rate limit: 5 order creations per minute per user
        const rl = await rateLimit(`razorpay:${userId}`, 5, 60);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many payment attempts. Please wait a moment.' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
            );
        }

        // Initialize Razorpay
        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        // Define the transaction amount (₹399 INR ~ $4.99 USD) 
        // Razorpay accepts amounts in paise (1 INR = 100 paise)
        const amountInPaise = 399 * 100;

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`,
            payment_capture: 1 // Auto capture the payment
        };

        const order = await razorpay.orders.create(options);

        // Return the Order ID to the frontend
        return NextResponse.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
        });

    } catch (err) {
        console.error("Razorpay order error:", err);
        return NextResponse.json(
            { error: "Failed to initialize fast-checkout. Ensure Razorpay keys are set in .env.local" },
            { status: 500 }
        );
    }
}
