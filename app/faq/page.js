"use client";

import { useState } from "react";

const categories = [
    {
        title: "Getting Started",
        items: [
            {
                q: "How does Midas Match work?",
                a: "Upload your resume and tell us your preferences. Our AI scans 8+ job sources simultaneously \u2014 including Google Jobs, LinkedIn, Indeed, and 350+ company career pages \u2014 then scores each listing against your profile using 7+ matching signals like skills, seniority, location, and role fit.",
            },
            {
                q: "Is it free to use?",
                a: "Yes. The free plan gives you 5 job scans per day, 5 AI deep analyses per day, and access to every job source we support. Tokens are available for power users who want extras like Midas Search (2\u00d7 coverage), but the core experience is completely free.",
            },
            {
                q: "What job sources do you scan?",
                a: "We scan multiple job databases simultaneously — including major search engines, professional networks, free job boards, and 350+ company career pages through direct API integrations. This means you see jobs that often don\u2019t appear on traditional aggregators.",
            },
        ],
    },
    {
        title: "Privacy & Security",
        items: [
            {
                q: "What happens to my resume after I upload it?",
                a: "Your resume is parsed in-memory to extract skills, experience, and preferences. We never store your resume file on our servers. A cached copy is kept locally in your browser\u2019s storage for convenience, but it never leaves your device unless you initiate a search.",
            },
            {
                q: "Is my data used for AI training?",
                a: "No. We explicitly opt out of LLM training with all AI providers we use. Your data is only used to generate your personal match results and is never shared for model training purposes.",
            },
            {
                q: "Can I delete my data?",
                a: "Yes. Go to Settings \u2192 Data & Privacy to export or permanently delete all your data. Local browser data can also be cleared from the same page.",
            },
        ],
    },
    {
        title: "Matching & Scoring",
        items: [
            {
                q: "How accurate are match scores?",
                a: "Match scores use 7+ signals including skills overlap, seniority level, location compatibility, role family, industry fit, and job recency. They\u2019re well-calibrated estimates designed to save you time, but they\u2019re not guarantees \u2014 always review listings that interest you.",
            },
            {
                q: "What is Deep Analysis?",
                a: "Deep Analysis is an AI-powered detailed fit assessment for a specific job. It provides a comprehensive verdict, estimated salary range, skill gap analysis, and personalized recommendations to improve your candidacy. Free users get 5 per day.",
            },
            {
                q: "Why did I get a low score for a job I think I\u2019m qualified for?",
                a: "Common reasons include: seniority mismatch (e.g., the listing targets a different experience level), missing specific keywords or skills in your resume, location mismatch, or the role belonging to a different job family than your background. Try running a Deep Analysis for a detailed breakdown.",
            },
        ],
    },
    {
        title: "Tokens & Billing",
        items: [
            {
                q: "How do I buy tokens?",
                a: "Click the token badge in the dashboard header or visit the pricing page. You\u2019ll be taken through a quick Razorpay checkout \u2014 50 tokens for \u20b9399 (~$4.99). Supports UPI, cards, net banking, and wallets.",
            },
            {
                q: "Do tokens expire?",
                a: "No. Tokens never expire. Once purchased, they remain in your account until you use them.",
            },
            {
                q: "What can I spend tokens on?",
                a: "Midas Search scans cost 2 tokens each (giving you 2\u00d7 the job coverage of a standard scan). Additional deep analyses beyond the free daily limit cost 1 token each.",
            },
            {
                q: "Can I get a refund?",
                a: "Yes. Unused tokens are refundable within 7 days of purchase. See our refund policy for complete details and how to request a refund.",
            },
        ],
    },
];

export default function FAQPage() {
    const [openItems, setOpenItems] = useState({});

    const toggle = (categoryIdx, itemIdx) => {
        const key = `${categoryIdx}-${itemIdx}`;
        setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <main className="min-h-screen bg-white dark:bg-[#0f1117] py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <a
                    href="/"
                    className="text-sm text-brand-600 dark:text-brand-400 hover:underline mb-8 block"
                >
                    &larr; Back to Midas
                </a>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Frequently Asked Questions
                </h1>
                <p className="text-gray-500 dark:text-gray-300 text-sm mb-12">
                    Everything you need to know about Midas Match. Can&apos;t
                    find what you&apos;re looking for? Reach out to us at{" "}
                    <a
                        href="mailto:midasmatchsupport@gmail.com"
                        className="text-brand-600 dark:text-brand-400 hover:underline"
                    >
                        midasmatchsupport@gmail.com
                    </a>
                    .
                </p>

                <div className="space-y-10">
                    {categories.map((category, ci) => (
                        <section key={ci}>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                {category.title}
                            </h2>
                            <div className="divide-y divide-gray-200 dark:divide-[#2d3140] border-t border-b border-gray-200 dark:border-[#2d3140]">
                                {category.items.map((item, ii) => {
                                    const key = `${ci}-${ii}`;
                                    const isOpen = !!openItems[key];
                                    return (
                                        <div key={ii}>
                                            <button
                                                onClick={() => toggle(ci, ii)}
                                                aria-expanded={isOpen}
                                                className="w-full flex items-center justify-between py-4 text-left text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                            >
                                                {item.q}
                                                <svg
                                                    className={`w-5 h-5 shrink-0 text-gray-400 dark:text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </button>
                                            {isOpen && (
                                                <p className="pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                                    {item.a}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Cross-links */}
                <div className="mt-16 bg-gray-50 dark:bg-[#1a1d27] rounded-2xl p-8 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Still have questions?
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mb-6">
                        Check our legal pages or get in touch.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 text-sm">
                        <a
                            href="/pricing"
                            className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                        >
                            View Pricing
                        </a>
                        <a
                            href="/terms"
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#2d3140] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#22252f] transition-colors"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="/privacy"
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#2d3140] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#22252f] transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="/refund"
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#2d3140] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#22252f] transition-colors"
                        >
                            Refund Policy
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
