import Link from 'next/link';

const principles = [
    ['Search the market, not one board', 'Midas combines direct employer systems, public feeds, aggregators, and specialist sources. Source eligibility is decided per search using geography, health, and time budgets.'],
    ['Rank with evidence', 'Recommendations combine role family, seniority, domain, location, recency, skill evidence, and semantic similarity. The interface shows why a role surfaced instead of presenting an unexplained score.'],
    ['Degrade without collapsing', 'Core retrieval and deterministic scoring do not depend on an LLM. Optional classification and semantic passes have strict timeouts and fall back cleanly.'],
    ['Keep the workspace useful', 'Profiles, completed searches, saved roles, and application state can persist for signed-in users, so the product is more than a one-off scan.'],
];

export const metadata = { title: 'About', description: 'How Midas Match approaches evidence-led job search.' };

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-surface-50 px-4 py-16 text-slate-900">
            <div className="mx-auto max-w-4xl">
                <Link href="/" className="text-sm font-semibold text-brand-700 hover:text-brand-900">&larr; Back to Midas</Link>
                <div className="mt-14 grid gap-10 border-b border-slate-900/10 pb-14 lg:grid-cols-[0.75fr_1.25fr]">
                    <span className="mm-kicker h-fit w-fit">About Midas</span>
                    <div>
                        <h1 className="font-headline text-5xl font-extrabold tracking-[-0.05em] text-slate-950 md:text-6xl">A job search system built to show its work.</h1>
                        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">Job seekers should not have to choose between endless listings and opaque recommendations. Midas retrieves broadly, ranks conservatively, and exposes the evidence behind the shortlist.</p>
                    </div>
                </div>

                <section className="py-14">
                    <h2 className="font-headline text-2xl font-extrabold text-slate-950">Product principles</h2>
                    <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900/10 md:grid-cols-2">
                        {principles.map(([title, body], index) => (
                            <article key={title} className="bg-white p-7">
                                <span className="font-mono text-[10px] font-bold text-brand-700">0{index + 1}</span>
                                <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
                                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="grid gap-8 border-y border-slate-900/10 py-12 md:grid-cols-3">
                    <div><p className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Application</p><p className="mt-2 text-sm leading-6">Next.js App Router, React, Tailwind CSS, Clerk</p></div>
                    <div><p className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Data and runtime</p><p className="mt-2 text-sm leading-6">PostgreSQL with pgvector, Upstash Redis, Railway</p></div>
                    <div><p className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Operations</p><p className="mt-2 text-sm leading-6">Sentry diagnostics, GA4, bounded Apify actors, health-gated deploys</p></div>
                </section>

                <div className="py-12 text-sm text-slate-600">Questions or feedback? <a href="mailto:midasmatchsupport@gmail.com" className="font-bold text-brand-700 hover:text-brand-900">midasmatchsupport@gmail.com</a></div>
            </div>
        </main>
    );
}
