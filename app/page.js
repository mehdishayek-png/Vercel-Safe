'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Hero } from '@/components/Hero';
import { Header } from '@/components/Header';
import { Features } from '@/components/Features';
import { HowItWorks } from '@/components/HowItWorks';
import { DashboardPreview } from '@/components/DashboardPreview';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const JobDashboard = dynamic(() => import('@/components/JobDashboard').then(m => ({ default: m.JobDashboard })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Loading dashboard...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [view, setView] = useState('landing');
  const [apiKeys, setApiKeys] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem('midas_keys');
    if (stored) setApiKeys(JSON.parse(stored));
  }, []);

  if (view === 'dashboard') {
    return (
      <ErrorBoundary>
        <JobDashboard apiKeys={apiKeys} onBack={() => setView('landing')} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden selection:bg-brand-100">
      <Header />
      <Hero onStart={() => setView('dashboard')} onDemo={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })} />

      <div id="preview">
        <DashboardPreview />
      </div>

      <Features />
      <HowItWorks />

      {/* Final CTA */}
      <section className="py-24 text-center relative overflow-hidden bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">
            Ready to find your <span className="text-gradient">next role?</span>
          </h2>
          <p className="text-gray-400 mb-8 text-lg max-w-lg mx-auto">
            Join thousands of job seekers using AI to find better matches, faster.
          </p>
          <button
            onClick={() => setView('dashboard')}
            className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Launch Search Agent
          </button>
        </div>
      </section>

      <footer className="py-12 bg-gray-950 text-center text-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 mb-6">
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

          <div className="flex flex-wrap items-center justify-center gap-6 mb-6 text-gray-500">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="/refund" className="hover:text-white transition-colors">Refund Policy</a>
            <a href="mailto:support@midasmatch.com" className="hover:text-white transition-colors">Contact Support</a>
          </div>

          <p className="text-gray-600">
            &copy; 2026 Midas. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
    </ErrorBoundary>
  );
}
