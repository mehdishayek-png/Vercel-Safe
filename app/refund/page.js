import Link from 'next/link';

export const metadata = { title: 'Refund Policy' };

export default function RefundPage() {
    return (
        <main className="min-h-screen bg-surface-50 px-4 py-16 text-slate-900">
            <article className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm font-semibold text-brand-700 hover:text-brand-900">&larr; Back to Midas</Link>
                <span className="mm-kicker mt-12">Legal</span>
                <h1 className="mt-5 font-headline text-4xl font-extrabold tracking-[-0.04em] text-slate-950 md:text-5xl">Refund policy</h1>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">Last updated: July 18, 2026</p>

                <div className="mt-10 space-y-9 text-sm leading-6 text-slate-600">
                    <section><h2 className="text-lg font-bold text-slate-950">Current access</h2><p className="mt-3">New purchases are currently paused. The active Midas search and career workspace is included for signed-in users, so there is no new checkout to cancel or refund.</p></section>
                    <section><h2 className="text-lg font-bold text-slate-950">Historical purchases</h2><p className="mt-3">If you completed a Razorpay purchase before checkout was paused, contact support within seven days of the transaction. Include the account email, payment date, amount, and Razorpay payment or order ID. We will verify the transaction and review the request under the terms shown at the time of purchase.</p></section>
                    <section><h2 className="text-lg font-bold text-slate-950">Duplicate or failed payments</h2><p className="mt-3">For a duplicate charge, a debit without a confirmed order, or an incorrect amount, contact us promptly. Verified duplicate or failed transactions will be refunded to the original payment method where possible. Bank processing times are outside our control.</p></section>
                    <section><h2 className="text-lg font-bold text-slate-950">Request support</h2><p className="mt-3">Email <a href="mailto:midasmatchsupport@gmail.com" className="font-bold text-brand-700">midasmatchsupport@gmail.com</a>. Do not send card numbers, UPI credentials, passwords, or one-time codes.</p></section>
                </div>
            </article>
        </main>
    );
}
