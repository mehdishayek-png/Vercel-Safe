"use client";

import { useState } from "react";

const faqs = [
    {
        q: "What\u2019s a token?",
        a: "Tokens are credits used for premium features. Midas Search costs 2 tokens per scan (giving you 2\u00d7 the job coverage), and additional deep analyses cost 1 token each. You get a generous free tier before you ever need tokens.",
    },
    {
        q: "Do tokens expire?",
        a: "No. Tokens never expire. Once purchased, they stay in your account until you use them.",
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
        a: "No. The free plan gives you 5 job scans per day, 5 AI deep analyses per day, and access to all job sources. Tokens are entirely optional for power users.",
    },
];

const freePlan = [
    "5 job scans per day",
    "5 AI deep analyses per day",
    "All job sources (Google Jobs, LinkedIn, Indeed, 350+ ATS boards)",
    "Save & track applications",
    "Cover letter generation",
    "Email & community support",
];

const paidPlan = [
    "Everything in Free",
    "50 tokens per pack",
    "Midas Search \u2014 2\u00d7 coverage (2 tokens/scan)",
    "Additional deep analyses (1 token each)",
    "Tokens never expire",
    "Priority support",
];

export default function PricingPage() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <main className="min-h-screen bg-surface-50 dark:bg-ink-950 py-16 px-4">
            <div className="max-w-5xl mx-auto">
                <a
                    href="/"
                    className="text-sm text-brand-600 dark:text-brand-400 hover:underline mb-8 block"
                >
                    &larr; Back to Midas
                </a>

                {/* Header */}
                <div className="mb-14 max-w-xl">
                    <span className="gold-bar mb-4" />
                    <h1 className="font-display text-4xl font-bold text-ink-900 dark:text-ink-100 mb-3 tracking-tight">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-ink-500 dark:text-ink-400 text-lg">
                        Start for free. Buy tokens only when you need more power.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-20">
                    {/* Free Plan */}
                    <div className="border border-ink-200 dark:border-ink-800 rounded-[10px] p-8 flex flex-col bg-white dark:bg-[#1C1B19]">
                        <div className="mb-6">
                            <span className="inline-block text-xs font-semibold tracking-wide uppercase bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 px-3 py-1 rounded-md mb-4">
                                Current Plan
                            </span>
                            <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-100">
                                Free
                            </h2>
                            <p className="text-ink-500 dark:text-ink-400 text-sm mt-1">
                                Everything you need to start your job search
                            </p>
                            <div className="mt-4">
                                <span className="font-display text-4xl font-bold text-ink-900 dark:text-ink-100">
                                    \u20B90
                                </span>
                                <span className="text-ink-400 text-sm ml-1">
                                    / forever
                                </span>
                            </div>
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            {freePlan.map((f, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300"
                                >
                                    <svg
                                        className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <a
                            href="/dashboard"
                            className="block w-full text-center py-3 px-6 rounded-[10px] border border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-200 font-medium text-sm hover:bg-surface-100 dark:hover:bg-ink-800 transition-colors"
                        >
                            Get Started Free
                        </a>
                    </div>

                    {/* Token Pack */}
                    <div className="relative border-2 border-brand-500 rounded-[10px] p-8 flex flex-col bg-white dark:bg-[#1C1B19]">
                        <div className="mb-6">
                            <span className="inline-block text-xs font-semibold tracking-wide uppercase bg-brand-500 text-white px-3 py-1 rounded-md mb-4">
                                Best Value
                            </span>
                            <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-100">
                                Token Pack
                            </h2>
                            <p className="text-ink-500 dark:text-ink-400 text-sm mt-1">
                                For power users who want deeper insights
                            </p>
                            <div className="mt-4 flex items-baseline gap-2">
                                <span className="font-display text-4xl font-bold text-ink-900 dark:text-ink-100">
                                    \u20B9399
                                </span>
                                <span className="text-ink-400 text-sm">
                                    / 50 tokens
                                </span>
                                <span className="text-xs text-ink-400 ml-1">
                                    (~$4.99)
                                </span>
                            </div>
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            {paidPlan.map((f, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-200"
                                >
                                    <svg
                                        className="w-5 h-5 text-brand-500 shrink-0 mt-0.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <a
                            href="/dashboard"
                            className="block w-full text-center py-3 px-6 rounded-[10px] bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors"
                        >
                            Buy Tokens
                        </a>
                    </div>
                </div>

                {/* Feature Comparison */}
                <div className="max-w-4xl mb-20">
                    <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-100 mb-8 tracking-tight">
                        Feature comparison
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-ink-200 dark:border-ink-800">
                                    <th className="text-left py-3 pr-4 text-ink-500 font-medium">
                                        Feature
                                    </th>
                                    <th className="text-center py-3 px-4 text-ink-500 font-medium">
                                        Free
                                    </th>
                                    <th className="text-center py-3 pl-4 text-ink-500 font-medium">
                                        Token Pack
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-ink-600 dark:text-ink-300">
                                {[
                                    ["Daily job scans", "5/day", "5/day + Midas Search"],
                                    ["AI deep analyses", "5/day", "5/day + token top-ups"],
                                    ["Job sources", "All sources", "All sources"],
                                    ["Midas Search (2\u00d7 coverage)", "\u2014", "2 tokens/scan"],
                                    ["Save & track applications", "\u2713", "\u2713"],
                                    ["Cover letter generation", "\u2713", "\u2713"],
                                    ["Tokens expire?", "\u2014", "Never"],
                                    ["Support", "Community", "Priority"],
                                ].map(([feature, free, paid], i) => (
                                    <tr
                                        key={i}
                                        className="border-b border-ink-100 dark:border-ink-800"
                                    >
                                        <td className="py-3 pr-4 text-ink-700 dark:text-ink-200">
                                            {feature}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {free}
                                        </td>
                                        <td className="py-3 pl-4 text-center font-medium text-brand-600 dark:text-brand-400">
                                            {paid}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-3xl">
                    <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-100 mb-8 tracking-tight">
                        Frequently asked questions
                    </h2>
                    <div className="divide-y divide-ink-200 dark:divide-ink-800 border-t border-b border-ink-200 dark:border-ink-800">
                        {faqs.map((faq, i) => (
                            <div key={i}>
                                <button
                                    onClick={() =>
                                        setOpenFaq(openFaq === i ? null : i)
                                    }
                                    className="w-full flex items-center justify-between py-4 text-left text-sm font-medium text-ink-900 dark:text-ink-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                >
                                    {faq.q}
                                    <svg
                                        className={`w-5 h-5 shrink-0 text-ink-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
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
                                    <p className="pb-4 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                                        {faq.a}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-12 text-xs text-ink-400 space-x-4">
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
