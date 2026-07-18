import Link from 'next/link';
import { ArrowRight, Check, Database, Radar, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';

const INCLUDED = [
    ['Multi-source job search', 'Search direct employer systems, public feeds, aggregators, and specialist sources from one profile.'],
    ['Evidence-led ranking', 'Role family, seniority, location, domain, recency, and semantic fit inform the shortlist.'],
    ['Career workspace', 'Keep your profile, saved roles, applications, and recent search results available across devices.'],
    ['Job intelligence', 'Use role analysis, interview preparation, and supporting career tools from each job record.'],
];

export const metadata = {
    title: 'Access',
    description: 'Midas Match product access and included capabilities.',
};

export default function PricingPage() {
    return (
        <main className="min-h-screen bg-surface-50 text-slate-900">
            <Header />
            <section className="mm-shell pb-24 pt-36 md:pt-44">
                <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                    <div>
                        <span className="mm-kicker">Product access</span>
                        <h1 className="mt-6 font-headline text-5xl font-extrabold tracking-[-0.05em] text-slate-950 md:text-6xl">The full workspace is currently included.</h1>
                        <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">Token checkout is paused while the rebuilt platform is rolled out. You can use the current search and career workspace without purchasing credits.</p>
                        <Link href="/dashboard/search" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-600">
                            Start a search <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-slate-900/10 bg-white shadow-card">
                        <div className="flex items-center justify-between border-b border-slate-900/10 bg-brand-50 px-6 py-5">
                            <div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-brand-700">Current access</p>
                                <p className="mt-1 font-headline text-xl font-extrabold text-slate-950">Midas workspace</p>
                            </div>
                            <span className="rounded-full bg-accent-100 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-700">Included</span>
                        </div>
                        <div className="divide-y divide-slate-900/10">
                            {INCLUDED.map(([title, body], index) => (
                                <div key={title} className="grid gap-3 p-6 sm:grid-cols-[32px_1fr]">
                                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-white"><Check className="h-3.5 w-3.5" /></span>
                                    <div><h2 className="text-sm font-bold text-slate-900">{title}</h2><p className="mt-1.5 text-xs leading-5 text-slate-600">{body}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-20 grid gap-px overflow-hidden border-y border-slate-900/10 bg-slate-900/10 md:grid-cols-3">
                    {[
                        [Radar, 'Streaming retrieval', 'Results arrive as eligible sources finish.'],
                        [Sparkles, 'Graceful AI fallback', 'Core scoring remains available if an AI provider is unavailable.'],
                        [Database, 'Cross-device state', 'Profile and job pipeline persist securely for signed-in users.'],
                    ].map(([Icon, title, body]) => (
                        <div key={title} className="bg-surface-50 p-7"><Icon className="h-5 w-5 text-brand-600" /><h2 className="mt-5 text-sm font-bold">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-600">{body}</p></div>
                    ))}
                </div>
            </section>
        </main>
    );
}
