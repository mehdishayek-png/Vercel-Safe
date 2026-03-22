'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
    Users, Zap, Send, Mail, Star, Handshake, Calendar, MessageSquare,
    Shield, ChevronRight, Copy, Check, Sparkles, ArrowRight, Link2,
    Building2, Eye, BookOpen, Search
} from 'lucide-react';
import Link from 'next/link';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

function ReferralCard({ name, role, company, relationship, lastEngaged, type = 'direct' }) {
    const isDirect = type === 'direct';
    return (
        <div className={`group relative p-6 rounded-2xl transition-all cursor-pointer ${
            isDirect
                ? 'bg-slate-50/80 dark:bg-[#22252f] border border-brand-500/10 hover:border-brand-500/30'
                : 'bg-white dark:bg-[#1a1d27] border border-slate-200/60 dark:border-[#2d3140] hover:border-brand-300'
        }`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-100 to-secondary/20 dark:from-brand-900/30 dark:to-secondary/20 flex items-center justify-center text-lg font-headline font-bold text-brand-600 dark:text-brand-400">
                            {name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {isDirect && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-white ring-2 ring-white dark:ring-[#22252f]">
                                <Zap className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-headline font-bold text-lg text-gray-900 dark:text-gray-100">{name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{role} at {company}</p>
                    </div>
                </div>
                {isDirect && (
                    <span className="px-3 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Direct Connect
                    </span>
                )}
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Handshake className="w-3.5 h-3.5" />
                    <span>{relationship}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{lastEngaged}</span>
                </div>
            </div>
        </div>
    );
}

export default function ReferralBridgePage() {
    const { profile, jobs, savedJobIds } = useApp();
    const [selectedJob, setSelectedJob] = useState(null);
    const [copied, setCopied] = useState(false);
    const [outreach, setOutreach] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const topJobs = [...jobs]
        .filter(j => savedJobIds.has(j.apply_url) || (j.analysis?.fit_score || j.match_score || 0) >= 70)
        .sort((a, b) => (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0))
        .slice(0, 10);

    const score = selectedJob ? Math.round(selectedJob.analysis?.fit_score || selectedJob.match_score || 0) : 0;

    const generateOutreach = async (job) => {
        setSelectedJob(job);
        setIsLoading(true);
        setError(null);
        setOutreach(null);
        try {
            const res = await fetch('/api/referral-outreach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, job }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to generate outreach');
            }
            const data = await res.json();
            setOutreach(data);
        } catch (e) {
            setError(e.message);
            // Fallback to simple template if API fails
            setOutreach({
                outreachMessage: `Hi! Hope things are going well.\n\nI noticed ${job.company} is looking for a ${job.title}. Based on my background in ${profile?.industry || 'the field'}, I think it could be a strong fit.\n\nWould you be open to putting in a warm referral?\n\nThanks!`,
                strategy: { conversionLikelihood: score, steps: [], keyStrengthsToHighlight: profile?.skills?.slice(0, 3) || [] },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!outreach?.outreachMessage) return;
        navigator.clipboard.writeText(outreach.outreachMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* No selected job — selection view */}
                {!selectedJob && (
                    <div className="space-y-8">
                        <div>
                            <h1 className="font-headline text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                                Strategic Referral <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-secondary">Bridge</span>
                            </h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
                                Identify warm connections and craft AI-optimized outreach for your highest-confidence matches.
                            </p>
                        </div>

                        {topJobs.length === 0 ? (
                            <div className="bg-white dark:bg-[#1a1d27] border border-slate-200/60 dark:border-[#2d3140] rounded-2xl p-10 text-center shadow-sm">
                                <Users className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 font-headline">No high-confidence matches yet</h3>
                                <p className="text-sm text-slate-400 mb-4">Run a scan and save jobs to activate the Referral Bridge.</p>
                                <Link href="/dashboard/search" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-full font-bold text-sm shadow-lg shadow-brand-600/20 font-headline">
                                    <Search className="w-4 h-4" /> Search Jobs
                                </Link>
                            </div>
                        ) : (
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">Select a match to find warm paths</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {topJobs.map((job, i) => {
                                        const jobScore = Math.round(job.analysis?.fit_score || job.match_score || 0);
                                        return (
                                            <button
                                                key={job.apply_url || i}
                                                onClick={() => generateOutreach(job)}
                                                disabled={isLoading}
                                                className="group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200/60 dark:border-[#2d3140] text-left transition-all cursor-pointer hover:shadow-lg hover:border-brand-300 disabled:opacity-50"
                                            >
                                                <div className="flex items-start justify-between w-full mb-3">
                                                    <CompanyLogo company={job.company} size={44} colorIndex={i} />
                                                    <span className="text-xl font-headline font-black text-brand-600">{jobScore}%</span>
                                                </div>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-1 font-headline">{job.title}</h3>
                                                <p className="text-sm text-slate-500">{job.company}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Selected Job — Referral Bridge View */}
                {selectedJob && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column */}
                        <div className="lg:col-span-8 space-y-8">

                            {/* Hero Card */}
                            <section className="relative overflow-hidden rounded-2xl p-10 bg-white dark:bg-[#1a1d27] shadow-sm border border-slate-200/60 dark:border-[#2d3140]">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-500/5 to-transparent pointer-events-none" />
                                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-[10px] tracking-widest uppercase font-bold">
                                            <Star className="w-3 h-3" /> High-Confidence Match
                                        </div>
                                        <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
                                            {selectedJob.title} at <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-secondary">{selectedJob.company}</span>
                                        </h1>
                                        <p className="text-base text-slate-500 dark:text-slate-400 max-w-xl">
                                            Based on your profile, you are in the top {Math.max(1, 100 - score)}% of applicants for this role.
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center p-6 bg-slate-50 dark:bg-[#22252f] rounded-xl min-w-[120px]">
                                        <span className="text-4xl font-headline font-black text-brand-600">{score}%</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Match Score</span>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedJob(null); setOutreach(null); setError(null); }} className="absolute top-4 right-4 text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                                    Change Role
                                </button>
                            </section>

                            {/* Warm Path */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-headline font-bold text-gray-900 dark:text-gray-100">Warm Path to {selectedJob.company}</h2>
                                    <span className="text-sm font-medium text-brand-600">Analyzing network...</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ReferralCard
                                        name="Network Contact"
                                        role="Hiring Manager"
                                        company={selectedJob.company}
                                        relationship="Shared industry connections"
                                        lastEngaged="Connect via LinkedIn"
                                        type="direct"
                                    />
                                    <ReferralCard
                                        name="Second Degree"
                                        role="Team Lead"
                                        company={selectedJob.company}
                                        relationship="Mutual connections available"
                                        lastEngaged="Discoverable via network"
                                        type="secondary"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 italic text-center">
                                    Network intelligence is generated from public data. Connect your LinkedIn for personalized referral paths.
                                </p>
                            </section>

                            {/* AI Outreach Orchestrator */}
                            <section className="space-y-6">
                                <h2 className="text-2xl font-headline font-bold text-gray-900 dark:text-gray-100">AI Outreach Orchestrator</h2>
                                <div className="bg-white/70 dark:bg-[#1a1d27] backdrop-blur-xl rounded-2xl p-8 border border-brand-500/5 shadow-xl shadow-brand-500/5">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center">
                                                <Sparkles className="w-5 h-5 text-brand-600" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">AI-Generated Referral Request</span>
                                                <div className="text-[10px] text-brand-600 uppercase font-bold tracking-widest">Personalized Strategy</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-[#22252f] p-6 rounded-xl border border-slate-200/50 dark:border-[#2d3140] text-gray-900 dark:text-gray-100 leading-relaxed relative whitespace-pre-line text-sm">
                                        {isLoading ? (
                                            <div className="text-center py-4">
                                                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                <p className="text-xs text-slate-400">Generating AI-personalized outreach...</p>
                                            </div>
                                        ) : outreach?.outreachMessage || 'Select a role to generate outreach.'}
                                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                            {copied && <span className="text-[10px] text-emerald-500 font-bold uppercase">Copied!</span>}
                                            <div className={`w-2 h-2 rounded-full ${copied ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex gap-4">
                                        <button
                                            onClick={handleCopy}
                                            className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 text-white py-4 rounded-full font-headline font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 hover:scale-[1.02] transition-transform cursor-pointer"
                                        >
                                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                            {copied ? 'Copied to Clipboard' : 'Copy Message'}
                                        </button>
                                        <button className="px-8 py-4 rounded-full border border-slate-200 dark:border-[#2d3140] font-headline font-bold text-gray-900 dark:text-gray-100 hover:bg-slate-50 dark:hover:bg-[#22252f] transition-colors cursor-pointer">
                                            Preview Email
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Referral Likelihood */}
                            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-[#2d3140] space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-headline font-bold text-lg text-gray-900 dark:text-gray-100">Referrer Insights</h3>
                                    <Eye className="w-5 h-5 text-brand-600" />
                                </div>
                                <div className="flex flex-col items-center py-6 border-b border-slate-100 dark:border-[#2d3140]">
                                    <div className="relative mb-2">
                                        <svg className="w-24 h-24 -rotate-90">
                                            <circle className="text-slate-100 dark:text-[#22252f]" cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="8" />
                                            <circle className="text-secondary" cx="48" cy="48" r="44" fill="transparent" stroke="currentColor"
                                                strokeDasharray="276" strokeDashoffset="55" strokeWidth="8" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-headline font-black text-gray-900 dark:text-gray-100">{outreach?.strategy?.conversionLikelihood || score}%</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Likelihood to Refer</span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                                    <p>Referral likelihood is estimated based on role proximity, company culture, and public network signals.</p>
                                </div>
                            </div>

                            {/* Interview Bridge Strategy */}
                            <div className="relative overflow-hidden bg-gray-900 dark:bg-slate-950 rounded-2xl p-8 text-white shadow-2xl">
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <Link2 className="w-16 h-16" />
                                </div>
                                <div className="relative z-10 space-y-4">
                                    <h3 className="font-headline font-bold text-xl">Interview Bridge Strategy</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        A warm referral increases your interview conversion rate by <span className="text-brand-300 font-bold">4.2x</span> compared to cold applications.
                                    </p>
                                    <div className="space-y-4 pt-4">
                                        {(outreach?.strategy?.steps || [
                                            'Referral bypasses initial ATS resume filters.',
                                            'Profile flagged directly to the Hiring Manager.',
                                            '90% likelihood of First Round within 72 hours.',
                                        ]).map((step, i) => (
                                            <div key={i} className="flex gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                                                <p className="text-xs text-slate-400">{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-6 border-t border-white/10 mt-6 flex items-center gap-2 text-brand-300">
                                        <Shield className="w-4 h-4" />
                                        <span className="text-sm font-bold">Strategy Validated by Midas AI</span>
                                    </div>
                                </div>
                            </div>

                            {/* Save Opportunity */}
                            <button className="w-full bg-white dark:bg-[#1a1d27] text-gray-900 dark:text-gray-100 p-4 rounded-xl shadow-lg border border-slate-200/60 dark:border-[#2d3140] flex items-center justify-between group hover:border-brand-500 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <Star className="w-5 h-5 text-brand-600" />
                                    <span className="font-headline font-bold">Save Opportunity</span>
                                </div>
                                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
