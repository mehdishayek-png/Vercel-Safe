'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Hero } from '@/components/Hero';
import { Header } from '@/components/Header';
import { Features } from '@/components/Features';
import { HowItWorks } from '@/components/HowItWorks';
import { DashboardPreview } from '@/components/DashboardPreview';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy-load the massive dashboard (~62KB source) only when user enters dashboard view
const JobDashboard = dynamic(() => import('@/components/JobDashboard').then(m => ({ default: m.JobDashboard })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Loading dashboard...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [view, setView] = useState('landing'); // landing | dashboard
  const [apiKeys, setApiKeys] = useState({});

  useEffect(() => {
    // Check if user has keys in localStorage, or rely on server
    // For this version we rely on server env vars, but we keep this flexibility
    const stored = localStorage.getItem('jobbot_keys');
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
    <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden selection:bg-blue-100">
      <Header />
      <Hero onStart={() => setView('dashboard')} onDemo={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })} />

      <div id="preview">
        <DashboardPreview />
      </div>

      <Features />
      <HowItWorks />

      {/* Final CTA */}
      <section className="py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/20 to-transparent -z-10" />
        <div className="container mx-auto px-4">
          <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
            Ready to find your <span className="text-indigo-400">next role?</span>
          </h2>
          <button
            onClick={() => setView('dashboard')}
            className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform"
          >
            Launch Search Agent
          </button>
        </div>
      </section>

      <footer className="py-16 bg-gray-950 text-center text-sm">
        <div className="container mx-auto px-4">
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Encrypted &amp; Secure
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Resume Not Stored
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              No AI Training on Your Data
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              Razorpay Secured Payments
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-6 text-gray-500">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="/refund" className="hover:text-white transition-colors">Refund Policy</a>
            <a href="mailto:support@jobbot.ai" className="hover:text-white transition-colors">Contact Support</a>
          </div>

          <p className="text-gray-600">
            &copy; 2026 JobBot AI. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
