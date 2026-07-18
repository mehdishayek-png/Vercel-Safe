import Link from 'next/link';
import {
    ArrowRight, Bookmark, BriefcaseBusiness, Check, Database, FileSearch,
    Fingerprint, Layers3, MapPin, Radar, Search, ShieldCheck, Sparkles, Target,
} from 'lucide-react';
import { Header } from '@/components/Header';

const MATCHES = [
    { score: 92, title: 'Strategy & Transactions Consultant', company: 'Global advisory firm', location: 'Bengaluru', signal: 'Role family aligned' },
    { score: 84, title: 'M&A Advisory Associate', company: 'Corporate finance team', location: 'Mumbai', signal: '6 evidence signals' },
    { score: 76, title: 'Due Diligence Analyst', company: 'Professional services', location: 'Hybrid', signal: 'Strong skill overlap' },
];

const CAPABILITIES = [
    {
        icon: Radar,
        index: '01',
        title: 'Search beyond one job board',
        body: 'One profile becomes focused queries across direct employer systems, public feeds, aggregators, and specialist sources.',
    },
    {
        icon: Fingerprint,
        index: '02',
        title: 'Score career fit, not keyword noise',
        body: 'Role family, seniority, location, domain, recency, and skill depth are evaluated before semantic refinement.',
    },
    {
        icon: FileSearch,
        index: '03',
        title: 'Read the evidence behind a match',
        body: 'Full job descriptions power explainable score signals, role analysis, salary context, and interview preparation.',
    },
];

function ProductPreview() {
    return (
        <div className="relative mx-auto min-w-0 w-full max-w-[720px]">
            <div className="absolute -inset-4 -z-10 rotate-1 rounded-[30px] border border-brand-200 bg-brand-100/60" />
            <div className="overflow-hidden rounded-[22px] border border-slate-900/10 bg-white shadow-[0_32px_90px_rgba(24,31,46,0.16)]">
                <div className="flex h-12 items-center justify-between border-b border-slate-900/10 bg-surface-50 px-4">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#ef6a5b]" />
                        <span className="h-2 w-2 rounded-full bg-[#e8a23a]" />
                        <span className="h-2 w-2 rounded-full bg-accent-500" />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">Match evidence / live view</span>
                    <span className="h-2 w-2 rounded-full bg-accent-500 ai-pulse" />
                </div>
                <div className="grid min-h-[430px] md:grid-cols-[155px_1fr]">
                    <aside className="hidden border-r border-slate-900/10 bg-[#f1f0eb] p-4 md:block">
                        <div className="mb-8 flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">M</span>
                            <span className="text-[10px] font-bold text-slate-800">Midas Match</span>
                        </div>
                        {[['Discover', Search], ['Shortlist', Bookmark], ['Pipeline', BriefcaseBusiness]].map(([label, Icon], index) => (
                            <div key={label} className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[9px] font-semibold ${index === 0 ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
                                <Icon className="h-3 w-3" /> {label}
                            </div>
                        ))}
                        <div className="mt-28 border-t border-slate-900/10 pt-4">
                            <p className="font-mono text-[7px] uppercase tracking-widest text-slate-400">Profile signal</p>
                            <p className="mt-2 text-[9px] font-bold text-slate-800">Deal advisory</p>
                            <p className="mt-1 text-[8px] text-slate-500">5 years experience</p>
                        </div>
                    </aside>
                    <div className="p-4 sm:p-6">
                        <div className="mb-5 flex items-end justify-between gap-4">
                            <div>
                                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-brand-600">Ranked for your profile</p>
                                <h3 className="mt-1.5 font-headline text-lg font-extrabold tracking-tight text-slate-900">Evidence-led matches</h3>
                            </div>
                            <span className="rounded-full bg-accent-50 px-2.5 py-1 font-mono text-[8px] font-semibold text-accent-700">Search complete</span>
                        </div>
                        <div className="space-y-2.5">
                            {MATCHES.map((match, index) => (
                                <article key={match.title} className={`grid grid-cols-[48px_1fr] gap-3 border p-3.5 sm:grid-cols-[48px_1fr_auto] ${index === 0 ? 'border-brand-200 bg-brand-50/55' : 'border-slate-900/10 bg-white'}`}>
                                    <div className="grid h-11 w-11 place-items-center rounded-full border-4 border-white bg-slate-900 font-mono text-[11px] font-bold text-white shadow-sm">{match.score}</div>
                                    <div className="min-w-0">
                                        <h4 className="truncate text-[11px] font-bold text-slate-900 sm:text-xs">{match.title}</h4>
                                        <p className="mt-1 truncate text-[9px] text-slate-500">{match.company} · {match.location}</p>
                                        <p className="mt-2 flex items-center gap-1 text-[8px] font-semibold text-accent-700"><Check className="h-3 w-3" /> {match.signal}</p>
                                    </div>
                                    <button className="hidden self-center border-l border-slate-900/10 pl-3 text-[9px] font-bold text-brand-700 sm:block">View evidence</button>
                                </article>
                            ))}
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-900/10 pt-4">
                            {[['Role family', 'Aligned'], ['Location', 'Exact'], ['Recency', 'Current']].map(([label, value]) => (
                                <div key={label}>
                                    <p className="font-mono text-[7px] uppercase tracking-wider text-slate-400">{label}</p>
                                    <p className="mt-1 text-[9px] font-bold text-slate-700">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    return (
        <main className="overflow-hidden bg-surface-50 text-slate-900">
            <Header />

            <section className="relative pb-24 pt-32 md:pb-32 md:pt-44">
                <div className="absolute inset-0 -z-0 mm-grid opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
                <div className="mm-shell relative z-10 grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-16 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                    <div className="min-w-0">
                        <span className="mm-kicker">Search with evidence</span>
                        <h1 className="mt-7 max-w-[660px] break-words font-headline text-[clamp(2.5rem,11.5vw,5.7rem)] font-extrabold leading-[0.97] tracking-[-0.055em] text-slate-950">
                            Stop browsing jobs. <span className="text-brand-600">Interrogate the market.</span>
                        </h1>
                        <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
                            Midas turns your resume into a precise search strategy, scans across the market, and shows why each role belongs in your next move.
                        </p>
                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <Link href="/dashboard/search" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-brand-600">
                                Build my match profile <ArrowRight className="h-4 w-4" />
                            </Link>
                            <a href="#product" className="inline-flex items-center justify-center rounded-xl border border-slate-900/15 bg-white/70 px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-white">See the evidence model</a>
                        </div>
                        <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-900/10 pt-5 text-[11px] font-medium text-slate-500">
                            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent-600" /> Resume privacy controls</span>
                            <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-brand-600" /> Cross-device profile</span>
                            <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-[#d48724]" /> Explainable ranking</span>
                        </div>
                    </div>
                    <ProductPreview />
                </div>
            </section>

            <section id="product" className="border-y border-slate-900/10 bg-white py-20 md:py-28">
                <div className="mm-shell">
                    <div className="grid gap-8 border-b border-slate-900/10 pb-14 lg:grid-cols-[0.65fr_1fr] lg:items-end">
                        <div>
                            <span className="mm-kicker">The product</span>
                            <h2 className="mt-5 font-headline text-4xl font-extrabold tracking-[-0.04em] text-slate-950 md:text-5xl">A decision system, not a list of links.</h2>
                        </div>
                        <p className="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end">Every result carries context: where it came from, how current it is, which skills support the score, whether the seniority fits, and what evidence weakened the match.</p>
                    </div>

                    <div className="grid md:grid-cols-3">
                        {CAPABILITIES.map((capability, index) => {
                            const Icon = capability.icon;
                            return (
                                <article key={capability.title} className={`relative py-10 md:px-8 md:py-14 ${index > 0 ? 'border-t border-slate-900/10 md:border-l md:border-t-0' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-6 w-6 text-brand-600" />
                                        <span className="font-mono text-[10px] text-slate-400">{capability.index}</span>
                                    </div>
                                    <h3 className="mt-10 font-headline text-xl font-extrabold tracking-tight text-slate-900">{capability.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">{capability.body}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section id="method" className="bg-slate-950 py-24 text-white md:py-32">
                <div className="mm-shell grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <span className="mm-kicker !text-brand-300">How it works</span>
                        <h2 className="mt-6 max-w-lg font-headline text-4xl font-extrabold tracking-[-0.04em] md:text-5xl">From resume to a defensible shortlist.</h2>
                        <p className="mt-6 max-w-lg text-sm leading-7 text-slate-400">The engine separates retrieval from ranking. That matters: finding more jobs should never mean lowering the standard for what reaches you.</p>
                    </div>
                    <ol className="border-t border-white/15">
                        {[
                            ['Profile model', 'Extract role, skills, experience, domain, and location intent from your resume.'],
                            ['Market retrieval', 'Generate focused queries and run eligible sources concurrently within strict budgets.'],
                            ['Constraint scoring', 'Reject career-family bleed and measure title, seniority, location, domain, and recency.'],
                            ['Semantic refinement', 'Re-rank the strongest candidates against your profile and retain the evidence.'],
                        ].map(([title, body], index) => (
                            <li key={title} className="grid gap-3 border-b border-white/15 py-6 sm:grid-cols-[54px_180px_1fr] sm:items-start">
                                <span className="font-mono text-xs text-brand-300">0{index + 1}</span>
                                <h3 className="text-sm font-bold text-white">{title}</h3>
                                <p className="text-sm leading-6 text-slate-400">{body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section id="trust" className="bg-[#e8ece5] py-20 md:py-28">
                <div className="mm-shell grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                    <div>
                        <span className="mm-kicker !text-accent-700">Built for trust</span>
                        <h2 className="mt-5 max-w-2xl font-headline text-4xl font-extrabold tracking-[-0.04em] text-slate-950 md:text-5xl">Your career data should work for you, not disappear into a black box.</h2>
                    </div>
                    <div className="border-l border-slate-900/15 pl-6 md:pl-10">
                        {[
                            ['Clear score evidence', 'See the signals supporting every recommendation.'],
                            ['Portable job pipeline', 'Keep shortlists and applications available across devices.'],
                            ['Graceful degradation', 'Core matching still works when an external AI or data source is unavailable.'],
                        ].map(([title, body]) => (
                            <div key={title} className="flex gap-3 border-b border-slate-900/10 py-4 first:pt-0 last:border-0 last:pb-0">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" />
                                <div><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{body}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-brand-600 py-20 text-white">
                <div className="mm-shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-100">Your next search can be better</p>
                        <h2 className="mt-3 max-w-3xl font-headline text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Bring your resume. Leave with a reasoned shortlist.</h2>
                    </div>
                    <Link href="/dashboard/search" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand-700 transition hover:bg-surface-50">Start matching <ArrowRight className="h-4 w-4" /></Link>
                </div>
            </section>

            <footer className="bg-slate-950 py-12 text-slate-400">
                <div className="mm-shell flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-xs font-extrabold text-slate-950">M</span><span className="font-headline text-sm font-extrabold text-white">Midas Match</span></div>
                        <p className="mt-4 max-w-sm text-xs leading-5">Career intelligence for people who want fewer, better job decisions.</p>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
                        <Link href="/privacy" className="hover:text-white">Privacy</Link>
                        <Link href="/terms" className="hover:text-white">Terms</Link>
                        <Link href="/faq" className="hover:text-white">FAQ</Link>
                        <Link href="/about" className="hover:text-white">About</Link>
                        <a href="mailto:midasmatchsupport@gmail.com" className="hover:text-white">Support</a>
                    </div>
                </div>
            </footer>
        </main>
    );
}
