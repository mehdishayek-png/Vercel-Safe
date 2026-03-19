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
            <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden selection:bg-brand-100">
                <Header />
                <Hero
                    onStart={() => window.location.href = '/dashboard/search'}
                    onDemo={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}
                />

                {/* Social proof / stats strip */}
                <section className="py-16 bg-gray-50 dark:bg-[#12141c]">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 max-w-5xl mx-auto text-center">
                            <div>
                                <div className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">1,000+</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Jobs Scanned Per Search</div>
                            </div>
                            <div>
                                <div className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">350+</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Company Career Pages</div>
                            </div>
                            <div>
                                <div className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">8+</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Job Sources Aggregated</div>
                            </div>
                            <div>
                                <div className="text-4xl md:text-5xl font-extrabold text-brand-600 dark:text-brand-400">&lt;60s</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Average Scan Time</div>
                            </div>
                        </div>
                    </div>
                </section>

                <div id="preview">
                    <DashboardPreview />
                </div>

                <Features />
                <HowItWorks />

                {/* Final CTA */}
                <section className="py-24 text-center relative overflow-hidden bg-gray-900">
                    {/* Animated gradient mesh for CTA */}
                    <div className="absolute inset-0 -z-0">
                        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute top-1/3 right-1/4 w-[175px] md:w-[350px] h-[175px] md:h-[350px] bg-teal-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[250px] md:w-[500px] h-[125px] md:h-[250px] bg-brand-500/8 rounded-full blur-[80px]" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">
                            Ready to find your <span className="text-gradient">next role?</span>
                        </h2>
                        <p className="text-gray-400 mb-8 text-lg max-w-lg mx-auto">
                            Join thousands of job seekers using AI to find better matches, faster.
                        </p>
                        <Link
                            href="/dashboard/search"
                            className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-gray-100 transition-colors inline-block shadow-lg shadow-white/10 hover:shadow-white/20"
                        >
                            Get Started Free
                        </Link>
                        <p className="text-sm text-gray-400 mt-3">Free during beta</p>
                    </div>
                </section>

                <footer className="py-12 bg-gray-950 text-sm">
                    <div className="container mx-auto px-4">
                        {/* Tagline */}
                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center gap-2.5 mb-2">
                                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
                                    M
                                </div>
                                <span className="text-base font-bold text-white tracking-tight">Midas</span>
                            </div>
                            <p className="text-gray-500 text-sm">AI-powered job matching that actually works.</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-6 mb-8">
                            {[
                                { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Encrypted & Secure', color: 'text-emerald-500' },
                                { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Resume Not Stored', color: 'text-brand-400' },
                                { icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', label: 'No AI Training on Your Data', color: 'text-accent-400' },
                                { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Razorpay Secured Payments', color: 'text-amber-500' },
                            ].map(({ icon, label, color }) => (
                                <div key={label} className="flex items-center gap-2 text-gray-400 text-xs">
                                    <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
                                    {label}
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-800 pt-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500">
                                    <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                                    <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                                    <a href="/refund" className="hover:text-white transition-colors">Refund Policy</a>
                                    <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
                                    <a href="/faq" className="hover:text-white transition-colors">FAQ</a>
                                    <a href="/about" className="hover:text-white transition-colors">About</a>
                                    <a href="mailto:midasmatchsupport@gmail.com" className="hover:text-white transition-colors">Contact Support</a>
                                </div>

                                <a href="mailto:midasmatchsupport@gmail.com" className="text-gray-500 hover:text-white transition-colors">
                                    midasmatchsupport@gmail.com
                                </a>
                            </div>

                            <p className="text-gray-600 text-center mt-6">
                                &copy; 2026 Midas. All rights reserved.
                            </p>
                        </div>
                    </div>
                </footer>
            </main>
        </ErrorBoundary>
    );
}
