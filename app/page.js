'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Hero } from '@/components/Hero';
import { Header } from '@/components/Header';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Features = dynamic(() => import('@/components/Features').then(mod => ({ default: mod.Features })), {
    loading: () => <div className="h-96" />,
});
const HowItWorks = dynamic(() => import('@/components/HowItWorks').then(mod => ({ default: mod.HowItWorks })), {
    loading: () => <div className="h-64" />,
});
const DashboardPreview = dynamic(() => import('@/components/DashboardPreview').then(mod => ({ default: mod.DashboardPreview })), {
    loading: () => <div className="h-96" />,
});

export default function Home() {
    return (
        <ErrorBoundary>
            <main className="min-h-screen bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50 overflow-x-hidden selection:bg-brand-100 dark:selection:bg-brand-900/40">
                <Header />
                <Hero
                    onStart={() => window.location.href = '/dashboard/search'}
                    onDemo={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}
                />

                {/* Source pills — between hero and content */}
                <section className="py-8 bg-surface-50 dark:bg-ink-950 border-t border-ink-200 dark:border-ink-800">
                    <div className="container mx-auto px-6 lg:px-10 max-w-6xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs text-ink-400 uppercase tracking-wider font-medium mr-2">Scanning from</span>
                            {['LinkedIn', 'Indeed', 'Google Jobs', 'Career Pages', '350+ Sources'].map((source) => (
                                <span
                                    key={source}
                                    className="px-3 py-1 rounded-md text-xs font-medium border border-ink-200 dark:border-ink-800 text-ink-500 dark:text-ink-400 bg-white dark:bg-ink-900"
                                >
                                    {source}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                <div id="preview">
                    <DashboardPreview />
                </div>

                <Features />
                <HowItWorks />

                {/* Final CTA */}
                <section className="py-24 bg-ink-950 relative">
                    <div className="container mx-auto px-6 lg:px-10 max-w-6xl relative z-10">
                        <div className="max-w-xl">
                            <span className="gold-bar mb-6" />
                            <h2 className="font-display text-3xl md:text-5xl font-bold mb-5 tracking-tight text-white leading-tight">
                                Ready to find your next role?
                            </h2>
                            <p className="text-ink-400 mb-8 text-base">
                                Join thousands of job seekers using AI to find better matches, faster.
                            </p>
                            <Link
                                href="/dashboard/search"
                                className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-400 text-ink-950 rounded-[10px] font-semibold text-sm hover:bg-brand-300 transition-colors shadow-gold"
                            >
                                Get Started Free
                            </Link>
                            <p className="text-sm text-ink-600 mt-3">Free during beta</p>
                        </div>
                    </div>
                </section>

                <footer className="py-10 bg-ink-950 border-t border-ink-800 text-sm">
                    <div className="container mx-auto px-6 lg:px-10 max-w-6xl">
                        {/* Top row */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-2">
                                <span className="font-display text-base font-bold text-white tracking-tight">Midas</span>
                                <span className="gold-bar !w-2 !h-2 rounded-full" />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-500">
                                {[
                                    { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Encrypted' },
                                    { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Not stored' },
                                    { icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', label: 'No training' },
                                ].map(({ icon, label }) => (
                                    <span key={label} className="flex items-center gap-1.5 text-xs">
                                        <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-ink-800 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-x-5 gap-y-2 text-ink-500">
                                <a href="/privacy" className="hover:text-ink-300 transition-colors">Privacy</a>
                                <a href="/terms" className="hover:text-ink-300 transition-colors">Terms</a>
                                <a href="/refund" className="hover:text-ink-300 transition-colors">Refund</a>
                                <a href="/pricing" className="hover:text-ink-300 transition-colors">Pricing</a>
                                <a href="/faq" className="hover:text-ink-300 transition-colors">FAQ</a>
                                <a href="/about" className="hover:text-ink-300 transition-colors">About</a>
                                <a href="mailto:midasmatchsupport@gmail.com" className="hover:text-ink-300 transition-colors">Support</a>
                            </div>
                            <p className="text-ink-600 text-xs">&copy; 2026 Midas. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </main>
        </ErrorBoundary>
    );
}
