export default function RefundPolicy() {
    return (
        <main className="min-h-screen bg-white py-16 px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="max-w-3xl mx-auto">
                <a href="/" className="text-sm text-indigo-600 hover:underline mb-8 block">&larr; Back to Scout</a>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Refund & Cancellation Policy</h1>
                <p className="text-sm text-gray-400 mb-8">Last updated: March 2, 2026</p>

                <div className="prose prose-gray max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Token Purchases</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Scout AI operates on a prepaid token system. Tokens are purchased in packs of 50 for ₹399 (or equivalent) via Razorpay.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Refund Eligibility</h2>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                            <li><strong>Unused tokens:</strong> If no tokens from a purchased pack have been used, you may request a full refund within 7 days of purchase.</li>
                            <li><strong>Partially used tokens:</strong> If some tokens have been consumed, the remaining unused tokens are non-refundable.</li>
                            <li><strong>Failed transactions:</strong> If your payment was debited but tokens were not credited to your account, contact us immediately for a full refund or manual credit.</li>
                            <li><strong>Duplicate charges:</strong> If you were charged twice for the same purchase, the duplicate charge will be refunded in full.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How to Request a Refund</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Email <a href="mailto:support@midasmatch.com" className="text-indigo-600 hover:underline">support@midasmatch.com</a> with:
                        </p>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mt-2">
                            <li>Your registered email address</li>
                            <li>Razorpay payment ID (starts with <code className="text-xs bg-gray-100 px-1 rounded">pay_</code>)</li>
                            <li>Reason for refund</li>
                        </ul>
                        <p className="text-gray-600 text-sm leading-relaxed mt-2">
                            Refunds are processed within 5-7 business days to the original payment method.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cancellation</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Scout AI does not have recurring subscriptions. Token purchases are one-time transactions. There is nothing to cancel. Unused tokens remain in your account indefinitely and do not expire.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Contact</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            For billing or refund inquiries, contact us at <a href="mailto:support@midasmatch.com" className="text-indigo-600 hover:underline">support@midasmatch.com</a>.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
