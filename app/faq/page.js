"use client";

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const categories = [
    {
        title: 'Getting started',
        items: [
            ['How does Midas Match work?', 'Create a profile from your resume, choose a location, and start a search. Midas queries the eligible job sources in parallel, enriches thin descriptions, removes duplicates, and ranks each role using role family, seniority, location, domain, recency, skills, and semantic fit.'],
            ['What sources are searched?', 'The active mix changes by location, credentials, source health, and response budget. It can include direct employer systems, public feeds, search providers, aggregators, and specialist boards. The results screen reports which sources completed for your search.'],
            ['Is access included?', 'Yes. The current search and career workspace is included for signed-in users. New token purchases are paused while this version is rolled out. Reasonable rate limits still apply to protect source and AI capacity.'],
        ],
    },
    {
        title: 'Matching and results',
        items: [
            ['What does a match score mean?', 'The score is a ranking aid, not a hiring probability. It combines deterministic profile signals with semantic refinement and shows the strongest evidence behind a recommendation. Review the job description before applying.'],
            ['Why might a relevant role score lower?', 'Thin job descriptions, unusual titles, missing profile context, seniority differences, or a different role family can reduce confidence. Add concrete skills and a clear headline, then use role analysis to inspect the evidence and gaps.'],
            ['What is role analysis?', 'Role analysis uses your profile and the job description to explain strengths, concerns, likely gaps, salary context, and application positioning. It is available from a job record and remains subject to rate limits.'],
        ],
    },
    {
        title: 'Data and privacy',
        items: [
            ['What happens to my resume?', 'The uploaded file is parsed to create an editable profile. The original file is not retained after parsing. The resulting profile fields may be stored for signed-in users so the workspace works across devices.'],
            ['Are searches saved?', 'Completed searches and their ranked results may be stored for signed-in users. This keeps recent work available across devices and supports saved roles and application tracking. You can request deletion of account-linked data.'],
            ['Is AI always involved?', 'No. Retrieval and core scoring continue without an LLM. AI is used selectively for profile classification, semantic refinement, and requested career tools, with timeouts and deterministic fallbacks.'],
        ],
    },
    {
        title: 'Reliability and support',
        items: [
            ['Why do source counts vary?', 'Job sources have different geographic coverage, quotas, response times, and availability. Slow paid actors are stopped at a defined budget and any partial results already collected are retained.'],
            ['Can I still use a previous purchase?', 'New checkout is paused. Historical verified purchases remain recorded and are handled under the refund policy that applied to those transactions.'],
            ['How do I report a bad match?', 'Use the feedback controls on a job where available, or email the role title, company, and why it is wrong to midasmatchsupport@gmail.com. Match diagnostics let us trace the signals without changing your result manually.'],
        ],
    },
];

export default function FAQPage() {
    const [open, setOpen] = useState('0-0');

    return (
        <main className="min-h-screen bg-surface-50 px-4 py-16 text-slate-900">
            <div className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm font-semibold text-brand-700 hover:text-brand-900">&larr; Back to Midas</Link>
                <span className="mm-kicker mt-12">Product guide</span>
                <h1 className="mt-5 font-headline text-4xl font-extrabold tracking-[-0.04em] text-slate-950 md:text-5xl">Frequently asked questions</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">Clear answers about retrieval, scoring, access, and your data.</p>

                <div className="mt-12 space-y-10">
                    {categories.map((category, categoryIndex) => (
                        <section key={category.title}>
                            <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{category.title}</h2>
                            <div className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white">
                                {category.items.map(([question, answer], itemIndex) => {
                                    const key = `${categoryIndex}-${itemIndex}`;
                                    const isOpen = open === key;
                                    return (
                                        <div key={question} className="border-b border-slate-900/10 last:border-0">
                                            <button type="button" onClick={() => setOpen(isOpen ? '' : key)} className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left text-sm font-bold text-slate-900 hover:bg-surface-50" aria-expanded={isOpen}>
                                                {question}<ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isOpen && <p className="px-5 pb-5 text-sm leading-6 text-slate-600">{answer}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="mt-14 rounded-2xl bg-slate-950 p-7 text-white sm:flex sm:items-center sm:justify-between">
                    <div><h2 className="font-headline text-xl font-extrabold">Still need help?</h2><p className="mt-1 text-sm text-slate-400">Send the search context and the result you expected.</p></div>
                    <a href="mailto:midasmatchsupport@gmail.com" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 sm:mt-0">Contact support</a>
                </div>
            </div>
        </main>
    );
}
