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
            <main className="min-h-screen bg-midas-bg text-gray-900 overflow-x-hidden selection:bg-brand-100">
                <Header />
                <Hero
                    onStart={() => window.location.href = '/dashboard/search'}
                    onDemo={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}
                />

                {/* Social Proof / Logos */}
                <div id="preview">
                    <DashboardPreview />
                </div>

                <HowItWorks />
                <Features />

                {/* Final CTA — High Contrast Dark Section */}
                <section className="py-32 bg-gray-900 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/20 via-transparent to-secondary-DEFAULT/10 opacity-50" />
                    <div className="max-w-7xl mx-auto px-8 relative z-10 text-center">
                        <h2 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tighter mb-8">
                            Ready for the Midas Touch?
                        </h2>
                        <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
                            Join the top 1% of talent using intelligent flow to navigate the complex landscape of 2026's job market.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-6">
                            <Link
                                href="/dashboard/search"
                                className="bg-brand-600 text-white px-10 py-5 rounded-full text-xl font-bold hover:scale-[1.05] transition-transform shadow-2xl shadow-brand-600/40 inline-block"
                            >
                                Unlock Your Potential
                            </Link>
                            <Link
                                href="/about"
                                className="border-2 border-slate-600/30 text-white px-10 py-5 rounded-full text-xl font-bold hover:bg-white/10 transition-colors inline-block"
                            >
                                Enterprise Solutions
                            </Link>
                        </div>
                        <p className="mt-12 text-sm text-slate-500">No credit card required. Free during beta.</p>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-slate-50 w-full border-t-0 text-sm leading-relaxed">
                    <div className="flex flex-col md:flex-row justify-between items-center px-12 py-16 max-w-7xl mx-auto">
                        <div className="mb-8 md:mb-0">
                            <div className="text-lg font-bold text-slate-900 mb-2 font-headline">Midas Match AI</div>
                            <div className="text-slate-500 max-w-xs">&copy; 2026 Midas Match AI. Built for the Intelligent Flow.</div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-8">
                            <a className="text-slate-500 hover:text-brand-500 transition-colors" href="/privacy">Privacy Policy</a>
                            <a className="text-slate-500 hover:text-brand-500 transition-colors" href="/terms">Terms of Service</a>
                            <a className="text-slate-500 hover:text-brand-500 transition-colors" href="/about">About</a>
                            <a className="text-slate-500 hover:text-brand-500 transition-colors" href="/faq">FAQ</a>
                            <a className="text-slate-500 hover:text-brand-500 transition-colors" href="/pricing">Pricing</a>
                            <a className="text-slate-500 hover:text-brand-500 transition-colors" href="mailto:midasmatchsupport@gmail.com">Contact</a>
                        </div>
                    </div>
                </footer>
            </main>
        </ErrorBoundary>
    );
}
