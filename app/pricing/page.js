"use client";

import { useState } from "react";
import { useRazorpay } from "@/lib/useRazorpay";
import { useTokenStore } from "@/stores/token-store";

const faqs = [
    {
        q: "What\u2019s a token?",
        a: "Tokens are credits that power every AI action on Midas \u2014 job scans, deep analyses, cover letters, salary negotiations, and more. Each action costs 1 token.",
    },
    {
        q: "Do tokens expire?",
        a: "No. Tokens never expire \u2014 starter tokens or purchased tokens. They stay in your account until you use them.",
    },
    {
        q: "Can I get a refund?",
        a: "Yes. Unused tokens are refundable within 7 days of purchase. See our refund policy for full details.",
    },
    {
        q: "What payment methods are supported?",
        a: "Payments are processed by Razorpay. You can pay with UPI, credit/debit cards, net banking, and popular wallets like Paytm, PhonePe, and Google Pay.",
    },
    {
        q: "Do I need to pay to use Midas?",
        a: "No. Creating an account gives you 3 free starter tokens \u2014 1 immediately, then 1 each day for the next 2 days. After that, affordable token packs keep you going.",
    },
];

const Check = () => (
    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const PACKS = [
    {
        id: "starter",
        label: "Starter",
        price: 199,
        tokens: 25,
        perToken: "₹7.96",
        badge: null,
        description: "Perfect for a focused job hunt",
        features: ["25 tokens", "Job scans (1 token each)", "AI deep analyses (1 token each)", "Cover letters & outreach", "Tokens never expire"],
        highlight: false,
    },
    {
        id: "jobhunt",
        label: "Job Hunt",
        price: 399,
        tokens: 60,
        perToken: "₹6.65",
        badge: "Best Value",
        description: "For serious job seekers",
        features: ["60 tokens", "Job scans (1 token each)", "AI deep analyses (1 token each)", "Cover letters & outreach", "Tokens never expire", "Priority support"],
        highlight: true,
    },
    {
        id: "advantage",
        label: "Unfair Advantage",
        price: 799,
        tokens: 150,
        perToken: "₹5.33",
        badge: "Best per token",
        description: "Maximum firepower, lowest cost per token",
        features: ["150 tokens", "Job scans (1 token each)", "AI deep analyses (1 token each)", "Cover letters & outreach", "Tokens never expire", "Priority support"],
        highlight: false,
    },
];

export default function PricingPage() {
    const [openFaq, setOpenFaq] = useState(null);
    const { refreshTokens } = useTokenStore();
    const { initiatePayment, isProcessing } = useRazorpay({
        onSuccess: () => {
            refreshTokens();
        }
    });

    return (
        <main className="min-h-screen bg-surface-50 py-16 px-4">
            <div className="max-w-5xl mx-auto">
                <a href="/" className="text-sm text-brand-600 hover:underline mb-8 block">
                    &larr; Back to Midas
                </a>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto">
                        Start for free. Buy tokens only when you need more power.
                    </p>
                </div>

                {/* Free tier banner */}
                <div className="max-w-4xl mx-auto mb-8 rounded-2xl border border-gray-200 bg-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <span className="text-xs font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full mr-3">Free</span>
                        <span className="text-sm font-medium text-gray-700">3 starter tokens on sign-up</span>
                        <span className="text-xs text-gray-400 ml-2">(1 now + 1/day for 2 days)</span>
                    </div>
                    <a href="/dashboard" className="shrink-0 py-2 px-5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors text-center">
                        Get Started Free
                    </a>
                </div>

                {/* Token Pack Cards */}
                <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-20">
                    {PACKS.map((pack) => (
                        <div
                            key={pack.id}
                            className={`relative rounded-2xl p-7 flex flex-col ${
                                pack.highlight
                                    ? "border-2 border-brand-500 bg-gradient-to-br from-brand-50/60 to-white shadow-lg shadow-brand-100"
                                    : "border border-gray-200 bg-white"
                            }`}
                        >
                            {pack.badge && (
                                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wide uppercase px-3 py-1 rounded-full ${
                                    pack.highlight ? "bg-brand-600 text-white" : "bg-gray-800 text-white"
                                }`}>
                                    {pack.badge}
                                </span>
                            )}
                            <div className="mb-5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{pack.label}</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-bold text-gray-900">₹{pack.price}</span>
                                    <span className="text-gray-400 text-sm">/ {pack.tokens} tokens</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{pack.perToken} per token</p>
                                <p className="text-sm text-gray-500 mt-2">{pack.description}</p>
                            </div>

                            <ul className="space-y-2.5 mb-6 flex-1">
                                {pack.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                        <Check />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => initiatePayment(pack.id)}
                                disabled={isProcessing}
                                className={`w-full py-2.5 px-5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                    pack.highlight
                                        ? "bg-brand-600 text-white hover:bg-brand-700"
                                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                {isProcessing ? "Processing..." : `Buy ${pack.tokens} Tokens`}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Feature Comparison */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
                        What every token unlocks
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 pr-4 text-gray-500 font-medium">Action</th>
                                    <th className="text-center py-3 px-4 text-gray-500 font-medium">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600">
                                {[
                                    ["Job scan (standard)", "1 token"],
                                    ["Super Scan (2× coverage)", "2 tokens"],
                                    ["AI deep analysis", "1 token"],
                                    ["Cover letter generation", "1 token"],
                                    ["Salary negotiation playbook", "1 token"],
                                    ["Cold outreach DM", "1 token"],
                                    ["ATS CV tailoring", "3 tokens"],
                                ].map(([action, cost], i) => (
                                    <tr key={i} className="border-b border-gray-100">
                                        <td className="py-3 pr-4 text-gray-700">{action}</td>
                                        <td className="py-3 px-4 text-center font-medium text-brand-600">{cost}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
                        Frequently asked questions
                    </h2>
                    <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
                        {faqs.map((faq, i) => (
                            <div key={i}>
                                <button
                                    onClick={() =>
                                        setOpenFaq(openFaq === i ? null : i)
                                    }
                                    className="w-full flex items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors"
                                >
                                    {faq.q}
                                    <svg
                                        className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>
                                {openFaq === i && (
                                    <p className="pb-4 text-sm text-gray-600 leading-relaxed">
                                        {faq.a}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Links */}
                <div className="text-center mt-12 text-xs text-gray-400 space-x-4">
                    <a href="/terms" className="hover:underline">
                        Terms of Service
                    </a>
                    <a href="/privacy" className="hover:underline">
                        Privacy Policy
                    </a>
                    <a href="/refund" className="hover:underline">
                        Refund Policy
                    </a>
                </div>
            </div>
        </main>
    );
}
