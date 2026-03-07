'use client';
import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { Header } from '@/components/Header';
import { Features } from '@/components/Features';
import { HowItWorks } from '@/components/HowItWorks';
import { DashboardPreview } from '@/components/DashboardPreview';
import { JobDashboard } from '@/components/JobDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

      <footer className="py-12 border-t border-white/5 text-center text-white/20 text-sm">
        <div className="container mx-auto">
          © 2026 JobBot AI. All rights reserved. Built for the future of work.
        </div>
      </footer>
    </main>
  );
}
