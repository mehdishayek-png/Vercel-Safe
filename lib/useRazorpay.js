import { useState, useCallback } from 'react';

/**
 * Reusable Razorpay payment hook
 * Eliminates the 4x duplicated payment code across components
 * 
 * Usage:
 *   const { initiatePayment, isProcessing } = useRazorpay({ onSuccess });
 *   <button onClick={initiatePayment} disabled={isProcessing}>Buy Tokens</button>
 */
export function useRazorpay({ onSuccess, onError } = {}) {
    const [isProcessing, setIsProcessing] = useState(false);

    const loadScript = useCallback(() => {
        if (window.Razorpay) return Promise.resolve(true);
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    }, []);

    const initiatePayment = useCallback(async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            // 1. Load Razorpay SDK
            const loaded = await loadScript();
            if (!loaded) {
                throw new Error('Razorpay SDK failed to load. Are you online?');
            }

            // 2. Create order on server
            const orderRes = await fetch('/api/razorpay/order', { method: 'POST' });
            const orderData = await orderRes.json();
            if (orderData.error) {
                throw new Error(orderData.error);
            }

            // 3. Open Razorpay checkout
            const rzp = new window.Razorpay({
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Scout AI',
                description: '50x Deep Scan Tokens',
                order_id: orderData.id,
                handler: async (response) => {
                    try {
                        const verifyRes = await fetch('/api/razorpay/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(response),
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            // Tokens are now credited server-side
                            onSuccess?.(verifyData);
                        } else {
                            onError?.(new Error(verifyData.message || 'Payment verification failed'));
                        }
                    } catch (err) {
                        onError?.(err);
                    } finally {
                        setIsProcessing(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                    }
                },
                theme: { color: '#4F46E5' },
            });
            rzp.open();
        } catch (err) {
            console.error('Razorpay error:', err);
            onError?.(err);
            setIsProcessing(false);
        }
    }, [isProcessing, loadScript, onSuccess, onError]);

    return { initiatePayment, isProcessing };
}
