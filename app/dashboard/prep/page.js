'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ChevronDown, Sparkles, Target, MessageSquare, Building2, Lightbulb, AlertTriangle, Mic, Loader2, BookOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

const TYPE_COLORS = {
    behavioral: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    technical: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
    situational: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    culture: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
};

const DIFFICULTY_BADGE = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

function QuestionCard({ q, index }) {
    const [isOpen, setIsOpen] = useState(false);
    const colors = TYPE_COLORS[q.type] || TYPE_COLORS.behavioral;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`border ${colors.border} rounded-xl overflow-hidden`}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-50 dark:hover:bg-[#22252f] transition-colors cursor-pointer"
            >
                <span className="text-[13px] font-bold text-gray-300 dark:text-gray-300 mt-0.5 shrink-0 w-6">{String(index + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100 leading-snug">{q.question}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} capitalize`}>{q.type}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[q.difficulty] || DIFFICULTY_BADGE.medium} capitalize`}>{q.difficulty}</span>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pl-[52px] space-y-3">
                            <div>
                                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-1">Why they ask this</p>
                                <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">{q.why_asked}</p>
                            </div>
                            <div className={`${colors.bg} rounded-lg p-3`}>
                                <p className={`text-[11px] font-semibold ${colors.text} uppercase tracking-wider mb-1`}>How to answer</p>
                                <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">{q.answer_framework}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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

    // Get saved + top-scored jobs as prep candidates
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

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="font-headline text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-brand-600" />
                    Interview Prep
                </h1>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Select a job to generate personalized interview questions, answer frameworks, and company research.
                </p>
            </div>

            {/* Auth gate — show sign-in prompt upfront */}
            {!isSignedIn && (
                <div className="bg-gradient-to-r from-brand-50 to-secondary-DEFAULT/5 dark:from-brand-900/10 dark:to-secondary-DEFAULT/5 border border-brand-200 dark:border-brand-800/30 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">Sign in to use Interview Prep</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Generate personalized questions, answer frameworks, and company research for your matched jobs.</p>
                    </div>
                    <SignInButton mode="modal">
                        <button className="shrink-0 px-5 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer shadow-md shadow-brand-600/20 font-headline">
                            Sign In
                        </button>
                    </SignInButton>
                </div>
            )}

            {/* Job Selection */}
            {prepJobs.length === 0 ? (
                <div className="bg-white dark:bg-[#1a1d27] border border-slate-200/60 dark:border-[#2d3140] rounded-2xl p-8 text-center shadow-sm">
                    <BookOpen className="w-10 h-10 text-brand-400 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline">No jobs to prep for yet</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        Run a search and save some jobs first. Your saved jobs and strong matches will appear here.
                    </p>
                    <Link href="/dashboard/search" className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors font-headline">
                        <Search className="w-4 h-4" /> Search Jobs
                    </Link>
                </div>
            ) : (
                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-300 mb-4 uppercase tracking-wider">Select a job to prep for</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {prepJobs.map((job, i) => {
                            const isSelected = selectedJob?.apply_url === job.apply_url;
                            const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
                            const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                : score >= 60 ? 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
                                : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
                            const matchLabel = score >= 80 ? 'Strong Match' : score >= 60 ? 'Good Match' : 'Fair Match';
                            const postedDate = job.date_posted ? (typeof job.date_posted === 'string' && job.date_posted.includes('ago') ? job.date_posted : new Date(job.date_posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : null;
                            return (
                                <button
                                    key={job.apply_url || i}
                                    onClick={() => generatePrep(job)}
                                    disabled={isLoading}
                                    className={`group flex flex-col p-4 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 hover:shadow-md ${
                                        isSelected
                                            ? 'border-brand-300 bg-brand-50/50 dark:bg-brand-900/20 dark:border-brand-700 shadow-md ring-1 ring-brand-200'
                                            : 'border-surface-200 dark:border-[#2d3140] hover:border-brand-200 hover:bg-surface-50/50 dark:hover:bg-[#22252f]'
                                    }`}
                                >
                                    {/* Top: Logo + Score */}
                                    <div className="flex items-start justify-between w-full mb-3">
                                        <CompanyLogo company={job.company} size={40} colorIndex={i} />
                                        <div className={`text-lg font-bold px-2.5 py-0.5 rounded-lg border ${scoreColor}`}>{score}</div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-1.5">
                                        {job.title}
                                    </h3>

                                    {/* Company + Location */}
                                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-0.5">{job.company}</p>
                                    {job.location && (
                                        <p className="text-xs text-gray-400 dark:text-gray-300 mb-3">{job.location}</p>
                                    )}

                                    {/* Footer: match badge + date + source */}
                                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-surface-100 dark:border-[#2d3140]">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scoreColor}`}>{matchLabel}</span>
                                        {postedDate && <span className="text-[10px] text-gray-400">{postedDate}</span>}
                                        {job.source && <span className="text-[10px] text-gray-400 ml-auto truncate max-w-[100px]">{job.source}</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800 rounded-xl p-6 text-center"
                >
                    <Loader2 className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-2" />
                    <p className="text-sm font-medium text-brand-700 dark:text-brand-400">Generating your interview prep for {selectedJob?.title} at {selectedJob?.company}...</p>
                    <p className="text-xs text-brand-500 mt-1">This takes a few seconds</p>
                </motion.div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Prep Results */}
            {prep && selectedJob && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Job Header */}
                    <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#1a1d27] border border-surface-200 dark:border-[#2d3140] rounded-xl">
                        <CompanyLogo company={selectedJob.company} size={40} colorIndex={0} />
                        <div>
                            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{selectedJob.title}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-300">{selectedJob.company} {selectedJob.location ? `\u00B7 ${selectedJob.location}` : ''}</p>
                        </div>
                    </div>

                    {/* Elevator Pitch */}
                    {prep.opening_pitch && (
                        <div className="bg-gradient-to-r from-brand-50 to-violet-50 dark:from-brand-900/10 dark:to-violet-900/10 border border-brand-200 dark:border-brand-800 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Mic className="w-4 h-4 text-brand-600" />
                                <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Your 30-Second Pitch</h3>
                            </div>
                            <p className="text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed italic">"{prep.opening_pitch}"</p>
                        </div>
                    )}

                    {/* Questions */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-gray-400" />
                            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Interview Questions</h3>
                            <span className="text-[10px] text-gray-400 ml-1">Click to reveal answer framework</span>
                        </div>
                        <div className="space-y-2">
                            {(prep.questions || []).map((q, i) => (
                                <QuestionCard key={i} q={q} index={i} />
                            ))}
                        </div>
                    </div>

                    {/* Company Research */}
                    {prep.company_research && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-[#1a1d27] border border-surface-200 dark:border-[#2d3140] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 className="w-4 h-4 text-teal-500" />
                                    <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">Talking Points</h4>
                                </div>
                                <ul className="space-y-2">
                                    {(prep.company_research.talking_points || []).map((p, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[13px] text-gray-600 dark:text-gray-300">
                                            <span className="text-teal-500 mt-0.5 shrink-0">&bull;</span>
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white dark:bg-[#1a1d27] border border-surface-200 dark:border-[#2d3140] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                    <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">Questions to Ask Them</h4>
                                </div>
                                <ul className="space-y-2">
                                    {(prep.company_research.questions_to_ask || []).map((q, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[13px] text-gray-600 dark:text-gray-300">
                                            <span className="text-amber-500 mt-0.5 shrink-0">&bull;</span>
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Skill Gaps */}
                    {prep.skill_gaps_to_address && prep.skill_gaps_to_address.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">Prepare for These Gaps</h4>
                            </div>
                            <ul className="space-y-2">
                                {prep.skill_gaps_to_address.map((gap, i) => (
                                    <li key={i} className="text-[13px] text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                        <span className="text-amber-500 mt-0.5 shrink-0">&bull;</span>
                                        {gap}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
