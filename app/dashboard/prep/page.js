'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, ChevronDown, Sparkles, Target, MessageSquare, Building2,
    Lightbulb, AlertTriangle, Mic, Loader2, BookOpen, Search, Brain,
    Shield, Eye, Clock, ArrowRight, Zap, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

const CATEGORY_STYLES = {
    'Architectural Trade-offs': { bg: 'bg-secondary/10', text: 'text-secondary' },
    'Product Reliability': { bg: 'bg-brand-50 dark:bg-brand-900/20', text: 'text-brand-600 dark:text-brand-400' },
    'Strategic Alignment': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    behavioral: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
    technical: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400' },
    situational: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
    culture: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
};

function StressTestCard({ q, index }) {
    const [isOpen, setIsOpen] = useState(false);
    const category = q.type || q.category || 'behavioral';
    const styles = CATEGORY_STYLES[category] || CATEGORY_STYLES.behavioral;
    const probability = q.probability || (index === 0 ? 98 : index === 1 ? 85 : 72);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group p-6 rounded-xl bg-slate-50/80 dark:bg-[#22252f] border border-transparent hover:border-brand-500/10 transition-all cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
        >
            <div className="flex justify-between items-start mb-3">
                <span className={`px-3 py-1 rounded-full ${styles.bg} ${styles.text} text-[10px] font-bold uppercase tracking-widest`}>
                    {category}
                </span>
                <span className="text-xs font-bold text-slate-400">{probability}% Prob.</span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-snug">
                &ldquo;{q.question}&rdquo;
            </h4>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 space-y-3 pt-4 border-t border-slate-200/50 dark:border-[#2d3140]">
                            {q.why_asked && (
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Why they ask this</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{q.why_asked}</p>
                                </div>
                            )}
                            {q.answer_framework && (
                                <div className={`${styles.bg} rounded-lg p-4`}>
                                    <p className={`text-[11px] font-bold ${styles.text} uppercase tracking-wider mb-1`}>Suggested angle</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">{q.answer_framework}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && q.answer_framework && (
                <div className="mt-4 flex items-center gap-2">
                    <p className="text-xs text-slate-500 italic truncate">Suggested angle: {q.answer_framework.slice(0, 60)}...</p>
                </div>
            )}
        </motion.div>
    );
}

export default function InterviewPrepPage() {
    const { isSignedIn } = useUser();
    const { profile, jobs, savedJobIds, experienceYears, jobTitle, whatIDo } = useApp();
    const [selectedJob, setSelectedJob] = useState(null);
    const [prep, setPrep] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const prepJobs = [...jobs]
        .filter(j => savedJobIds.has(j.apply_url) || (j.analysis?.fit_score || j.match_score || 0) >= 60)
        .sort((a, b) => (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0))
        .slice(0, 20);

    const generatePrep = async (job) => {
        setSelectedJob(job);
        setIsLoading(true);
        setError(null);
        setPrep(null);

        try {
            const res = await fetch('/api/interview-prep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job,
                    profile: { ...profile, experience_years: experienceYears, headline: jobTitle, whatIDo }
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to generate prep');
            }

            const data = await res.json();
            setPrep(data.prep);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const score = selectedJob ? Math.round(selectedJob.analysis?.fit_score || selectedJob.match_score || 0) : 0;

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

                {/* Auth gate */}
                {!isSignedIn && (
                    <div className="bg-gradient-to-r from-brand-50 to-secondary/5 dark:from-brand-900/10 dark:to-secondary/5 border border-brand-200 dark:border-brand-800/30 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">Sign in to use Interview Prep</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Access the Strategic War Room with predicted questions and AI coaching.</p>
                        </div>
                        <SignInButton mode="modal">
                            <button className="shrink-0 px-5 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer shadow-md shadow-brand-600/20 font-headline">
                                Sign In
                            </button>
                        </SignInButton>
                    </div>
                )}

                {/* No selected job yet — Job Selection */}
                {!selectedJob && (
                    <>
                        <div>
                            <h1 className="font-headline text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                                Strategic Interview <span className="text-brand-600">War Room</span>
                            </h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
                                AI-powered preparation tailored to each specific role. Predicted questions, strategic context, and voice practice.
                            </p>
                        </div>

                        {prepJobs.length === 0 ? (
                            <div className="bg-white dark:bg-[#1a1d27] border border-slate-200/60 dark:border-[#2d3140] rounded-2xl p-10 text-center shadow-sm">
                                <BookOpen className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 font-headline">No jobs to prep for yet</h3>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                    Run a search and save some jobs first. Your saved jobs and strong matches will appear here.
                                </p>
                                <Link href="/dashboard/search" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-full font-bold text-sm shadow-lg shadow-brand-600/20 hover:scale-[1.02] transition-transform font-headline">
                                    <Search className="w-4 h-4" /> Search Jobs
                                </Link>
                            </div>
                        ) : (
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">Select a role to activate the War Room</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {prepJobs.map((job, i) => {
                                        const jobScore = Math.round(job.analysis?.fit_score || job.match_score || 0);
                                        return (
                                            <button
                                                key={job.apply_url || i}
                                                onClick={() => generatePrep(job)}
                                                disabled={isLoading}
                                                className="group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#1a1d27] border border-slate-200/60 dark:border-[#2d3140] text-left transition-all cursor-pointer disabled:opacity-50 hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-700"
                                            >
                                                <div className="flex items-start justify-between w-full mb-3">
                                                    <CompanyLogo company={job.company} size={44} colorIndex={i} />
                                                    <span className="text-xl font-headline font-black text-brand-600">{jobScore}%</span>
                                                </div>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-1 font-headline">{job.title}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
                                                {job.location && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{job.location}</p>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Loading State */}
                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-brand-50/50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800 rounded-2xl p-8 text-center">
                        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
                        <p className="text-base font-bold text-brand-700 dark:text-brand-400 font-headline">Activating War Room for {selectedJob?.title}...</p>
                        <p className="text-xs text-brand-500 mt-1">Analyzing job description, predicting interview patterns, generating strategic context</p>
                    </motion.div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* War Room View */}
                {prep && selectedJob && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

                        {/* War Room Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-bold uppercase tracking-widest">Active War Room</span>
                                <span className="text-slate-400 text-sm">/</span>
                                <span className="text-slate-500 text-sm">{selectedJob.title}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-4xl font-extrabold tracking-tighter font-headline text-gray-900 dark:text-gray-100">
                                        {selectedJob.company} Strategic Prep
                                    </h2>
                                    <p className="text-slate-500 mt-2 text-lg">Match Score: {score}%</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => { setSelectedJob(null); setPrep(null); }}
                                        className="px-6 py-3 rounded-full bg-slate-100 dark:bg-[#22252f] text-gray-900 dark:text-gray-100 font-bold text-sm hover:bg-slate-200 dark:hover:bg-[#2a2d37] transition-all cursor-pointer">
                                        Change Role
                                    </button>
                                    <button className="px-6 py-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-600/20 cursor-pointer">
                                        Sync New Data
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-12 gap-6">
                            {/* Main Column */}
                            <div className="col-span-12 lg:col-span-8 space-y-6">

                                {/* Predicted Stress Tests */}
                                <section className="bg-white dark:bg-[#1a1d27] rounded-2xl p-8 shadow-sm border border-slate-200/60 dark:border-[#2d3140]">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-bold font-headline text-gray-900 dark:text-gray-100">Predicted Neural Stress-Tests</h3>
                                            <p className="text-slate-500 text-sm mt-1">AI-generated based on JD analysis and your experience profile.</p>
                                        </div>
                                        <Brain className="w-6 h-6 text-secondary animate-pulse" />
                                    </div>
                                    <div className="space-y-4">
                                        {(prep.questions || []).map((q, i) => (
                                            <StressTestCard key={i} q={q} index={i} />
                                        ))}
                                    </div>
                                </section>

                                {/* Strategic Context + Midas Insight */}
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Company Context */}
                                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-8 shadow-sm border border-slate-200/60 dark:border-[#2d3140]">
                                        <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                            <TrendingUp className="w-5 h-5 text-brand-600" />
                                            Strategic Context
                                        </h3>
                                        {prep.company_research?.talking_points ? (
                                            <ul className="space-y-3">
                                                {prep.company_research.talking_points.map((p, i) => (
                                                    <li key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                                                        <span className="text-brand-500 mt-1 shrink-0">&bull;</span> {p}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Company intelligence will appear here after analysis.</p>
                                        )}
                                    </div>

                                    {/* Midas Insight */}
                                    <div className="bg-brand-600 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-10">
                                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                                                </pattern>
                                                <rect width="100" height="100" fill="url(#grid)" />
                                            </svg>
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
                                                <Sparkles className="w-5 h-5" /> Midas Insight
                                            </h3>
                                            <p className="text-white/80 text-sm leading-relaxed mb-6">
                                                Your {score}% match is driven by your experience in {profile?.industry || 'your industry'}.
                                                Focus on demonstrating how your background directly addresses their current priorities.
                                            </p>
                                            {prep.skill_gaps_to_address?.length > 0 && (
                                                <div className="bg-white/10 rounded-xl p-4 mb-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">Address these gaps</p>
                                                    {prep.skill_gaps_to_address.map((gap, i) => (
                                                        <p key={i} className="text-xs text-white/70 mb-1">&bull; {gap}</p>
                                                    ))}
                                                </div>
                                            )}
                                            <button className="w-full py-3 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold border border-white/30 hover:bg-white/30 transition-all cursor-pointer">
                                                Reveal Competitive Gap
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Elevator Pitch */}
                                {prep.opening_pitch && (
                                    <section className="bg-gradient-to-r from-brand-50 to-secondary/5 dark:from-brand-900/10 dark:to-secondary/5 border border-brand-200 dark:border-brand-800/30 rounded-2xl p-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Mic className="w-5 h-5 text-brand-600" />
                                            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 font-headline">Your 30-Second Pitch</h3>
                                        </div>
                                        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed italic">&ldquo;{prep.opening_pitch}&rdquo;</p>
                                    </section>
                                )}
                            </div>

                            {/* Right Sidebar */}
                            <div className="col-span-12 lg:col-span-4 space-y-6">

                                {/* Neural Readiness Score */}
                                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-8 shadow-sm border border-slate-200/60 dark:border-[#2d3140] flex flex-col items-center text-center">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-6">Neural Readiness</h3>
                                    <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle className="text-slate-100 dark:text-[#22252f]" cx="96" cy="96" r="88" fill="transparent" stroke="currentColor" strokeWidth="8" />
                                            <circle cx="96" cy="96" r="88" fill="transparent" stroke="url(#neural-grad)" strokeWidth="12"
                                                strokeDasharray="552.92" strokeDashoffset={552.92 * (1 - score / 100)} strokeLinecap="round" />
                                            <defs>
                                                <linearGradient id="neural-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#4f46e5" />
                                                    <stop offset="100%" stopColor="#712ae2" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-5xl font-extrabold font-headline tracking-tighter text-gray-900 dark:text-gray-100">
                                                {score}<span className="text-2xl text-brand-600">%</span>
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ready for War</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        {[...Array(4)].map((_, i) => (
                                            <span key={i} className={`w-2 h-2 rounded-full ${i < Math.ceil(score / 25) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500">Top {Math.max(1, 100 - score)}% of all applicants</p>
                                </div>

                                {/* Voice Prep Simulator */}
                                <div className="bg-white/70 dark:bg-[#1a1d27] backdrop-blur-xl border border-white/50 dark:border-[#2d3140] rounded-2xl p-8 shadow-2xl shadow-brand-500/5 relative overflow-hidden group">
                                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-500/20 blur-[60px] group-hover:bg-brand-500/40 transition-all duration-700" />
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-brand-600/30">
                                            <Mic className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold font-headline mb-2 text-gray-900 dark:text-gray-100">Voice Prep Simulator</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                            Practice the predicted questions with our AI Career Concierge. Real-time feedback on delivery and depth.
                                        </p>
                                        <Link href="/dashboard/voice-concierge"
                                            className="w-full py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-full font-bold flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-slate-100 transition-all">
                                            Start Practice Session <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Recruiter Pulse Timeline */}
                                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-8 shadow-sm border border-slate-200/60 dark:border-[#2d3140]">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-6 font-headline flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-brand-600" /> Recruiter Pulse
                                    </h3>
                                    <div className="space-y-6 relative before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-[#2d3140]">
                                        <div className="relative flex items-start gap-4 pl-8">
                                            <div className="absolute left-0 w-6 h-6 bg-white dark:bg-[#1a1d27] border-2 border-brand-600 rounded-full flex items-center justify-center z-10">
                                                <div className="w-2 h-2 bg-brand-600 rounded-full" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Profile under review</p>
                                                <p className="text-[10px] text-slate-400">Application submitted</p>
                                            </div>
                                        </div>
                                        <div className="relative flex items-start gap-4 pl-8">
                                            <div className="absolute left-0 w-6 h-6 bg-white dark:bg-[#1a1d27] border-2 border-slate-200 dark:border-[#2d3140] rounded-full flex items-center justify-center z-10">
                                                <div className="w-2 h-2 bg-slate-200 dark:bg-[#2d3140] rounded-full" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Pending AI match analysis</p>
                                                <p className="text-[10px] text-slate-400">Awaiting recruiter action</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Questions to Ask */}
                                {prep.company_research?.questions_to_ask && (
                                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-[#2d3140]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Lightbulb className="w-4 h-4 text-amber-500" />
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">Questions to Ask Them</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            {prep.company_research.questions_to_ask.map((q, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                    <span className="text-amber-500 mt-0.5 shrink-0">&bull;</span> {q}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
