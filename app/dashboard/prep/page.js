'use client';
import { useState, useEffect } from 'react';
import { useProfileStore } from '@/stores/profile-store';
import { useSearchStore } from '@/stores/search-store';
import { useJobsStore } from '@/stores/jobs-store';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ChevronDown, Sparkles, Target, MessageSquare, Building2, Lightbulb, AlertTriangle, Mic, Loader2, BookOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { safe } from '@/lib/safe-render';

const TYPE_COLORS = {
    behavioral: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    technical: { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200' },
    situational: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    culture: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const DIFFICULTY_BADGE = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    hard: 'bg-red-100 text-red-700',
};

function QuestionCard({ q, index }) {
    const [isOpen, setIsOpen] = useState(false);
    const colors = TYPE_COLORS[q.type] || TYPE_COLORS.behavioral;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-panel rounded-2xl border border-transparent shadow-sm hover:shadow-card-hover transition-shadow"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-start gap-4 p-5 text-left transition-colors cursor-pointer"
            >
                <span className="text-2xl font-bold text-gray-200 mt-0.5 shrink-0 w-8 text-right font-headline">{String(index + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} uppercase tracking-wider`}>{q.type}</span>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${DIFFICULTY_BADGE[q.difficulty] || DIFFICULTY_BADGE.medium} uppercase tracking-wider`}>{q.difficulty}</span>
                    </div>
                    <p className="text-base font-medium text-gray-900 leading-relaxed">{safe(q.question)}</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 mt-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 pl-[68px] space-y-4">
                            <div>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Why they ask this</p>
                                <p className="text-sm text-gray-600 leading-relaxed">{safe(q.why_asked)}</p>
                            </div>
                            <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
                                <p className={`text-[11px] font-bold ${colors.text} uppercase tracking-widest mb-1.5`}>How to answer</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{safe(q.answer_framework)}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function InterviewPrepPage() {
    const { profile, experienceYears, jobTitle, whatIDo } = useProfileStore();
    const jobs = useSearchStore(s => s.jobs);
    const savedJobIds = useJobsStore(s => s.savedJobIds);
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
        <div className="max-w-5xl mx-auto space-y-10 pb-12">
            {/* Page Header */}
            <div className="pt-2">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-flow-gradient flex items-center justify-center shadow-lg">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-headline font-bold text-gray-900 tracking-tight">
                            Interview Prep
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Practice questions tailored to your saved jobs
                        </p>
                    </div>
                </div>
            </div>

            {/* Job Selection Grid */}
            {prepJobs.length === 0 ? (
                <div className="glass-panel border border-outline-variant/10 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface-50 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-headline font-semibold text-gray-900 mb-2">No jobs to prep for yet</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        Run a search and save some jobs first. Your saved jobs and strong matches will appear here.
                    </p>
                    <Link href="/dashboard/search" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-flow-gradient text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow">
                        <Search className="w-4 h-4" /> Search Jobs
                    </Link>
                </div>
            ) : (
                <div>
                    <p className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Select a job to prep for</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {prepJobs.map((job, i) => {
                            const isSelected = selectedJob?.apply_url === job.apply_url;
                            const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
                            const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                                : score >= 60 ? 'text-teal-600 bg-teal-50 border-teal-200'
                                : 'text-amber-600 bg-amber-50 border-amber-200';
                            const matchLabel = score >= 80 ? 'Strong Match' : score >= 60 ? 'Good Match' : 'Fair Match';
                            const postedDate = job.date_posted ? (typeof job.date_posted === 'string' && job.date_posted.includes('ago') ? job.date_posted : new Date(job.date_posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : null;
                            return (
                                <button
                                    key={job.apply_url || i}
                                    onClick={() => generatePrep(job)}
                                    disabled={isLoading}
                                    className={`group relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer disabled:opacity-50 backdrop-blur-xl ${
                                        isSelected
                                            ? 'border-brand-600 bg-brand-50/80 shadow-card ring-2 ring-brand-200'
                                            : 'border-transparent bg-white/80/80 shadow-sm hover:shadow-card-hover hover:border-brand-200'
                                    }`}
                                >
                                    {/* Top: Logo + Score Pill */}
                                    <div className="flex items-start justify-between w-full mb-4">
                                        <CompanyLogo company={job.company} size={44} colorIndex={i} />
                                        <div className={`text-sm font-bold px-3 py-1 rounded-full border ${scoreColor}`}>{score}%</div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-[15px] font-headline font-bold text-gray-900 leading-snug line-clamp-2 mb-2">
                                        {job.title}
                                    </h3>

                                    {/* Company + Location */}
                                    <p className="text-sm text-gray-600 font-medium">{job.company}</p>
                                    {job.location && (
                                        <p className="text-xs text-gray-400 mt-0.5">{job.location}</p>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center gap-2 mt-auto pt-4">
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${scoreColor}`}>{matchLabel}</span>
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
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="ai-pulse rounded-2xl p-10 text-center bg-flow-gradient"
                >
                    <div className="w-12 h-12 rounded-full border-3 border-white/30 border-t-white animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
                    <p className="text-lg font-headline font-semibold text-white">Generating your interview prep...</p>
                    <p className="text-sm text-white/70 mt-1">{selectedJob?.title} at {selectedJob?.company}</p>
                    <p className="text-xs text-white/50 mt-2">This takes a few seconds</p>
                </motion.div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Prep Results */}
            {prep && selectedJob && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-8"
                >
                    {/* Selected Job Editorial Header */}
                    <div className="glass-panel rounded-2xl border border-outline-variant/10 p-6 shadow-card">
                        <div className="flex items-start gap-5">
                            <CompanyLogo company={selectedJob.company} size={56} colorIndex={0} />
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-headline font-bold text-gray-900 leading-tight mb-1">
                                    {selectedJob.title}
                                </h2>
                                <p className="text-base text-gray-500">
                                    {selectedJob.company}{selectedJob.location ? ` \u00B7 ${selectedJob.location}` : ''}
                                </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-3">
                                {(() => {
                                    const score = Math.round(selectedJob.analysis?.fit_score || selectedJob.match_score || 0);
                                    const pillColor = score >= 80 ? 'bg-emerald-100 text-emerald-700'
                                        : score >= 60 ? 'bg-teal-100 text-teal-700'
                                        : 'bg-amber-100 text-amber-700';
                                    return <span className={`text-lg font-bold px-4 py-1.5 rounded-full ${pillColor}`}>{score}%</span>;
                                })()}
                                <button
                                    onClick={() => generatePrep(selectedJob)}
                                    disabled={isLoading}
                                    className="px-5 py-2.5 rounded-xl bg-flow-gradient text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generate Questions
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Elevator Pitch */}
                    {prep.opening_pitch && (
                        <div className="bg-flow-gradient rounded-2xl p-7 shadow-lg relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_white_0%,_transparent_60%)]" />
                            <div className="relative">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <Mic className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="text-base font-headline font-bold text-white">Your 30-Second Pitch</h3>
                                </div>
                                <p className="text-[15px] text-white/90 leading-relaxed italic">&ldquo;{safe(prep.opening_pitch)}&rdquo;</p>
                            </div>
                        </div>
                    )}

                    {/* Interview Questions */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <MessageSquare className="w-4 h-4 text-gray-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-headline font-bold text-gray-900">Interview Questions</h3>
                                    <p className="text-xs text-gray-400">Click any question to reveal the answer framework</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-gray-400 bg-surface-50 px-3 py-1.5 rounded-full">{(prep.questions || []).length} questions</span>
                        </div>
                        <div className="space-y-3">
                            {(prep.questions || []).map((q, i) => (
                                <QuestionCard key={i} q={q} index={i} />
                            ))}
                        </div>
                    </div>

                    {/* Company Research - Two Column */}
                    {prep.company_research && (
                        <div>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                </div>
                                <h3 className="text-lg font-headline font-bold text-gray-900">Company Research</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="glass-panel border border-outline-variant/10 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                                    <div className="flex items-center gap-2.5 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                            <Target className="w-4 h-4 text-teal-600" />
                                        </div>
                                        <h4 className="text-sm font-headline font-bold text-gray-900">Talking Points</h4>
                                    </div>
                                    <ul className="space-y-3">
                                        {(prep.company_research.talking_points || []).map((p, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                                                {safe(p)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="glass-panel border border-outline-variant/10 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow">
                                    <div className="flex items-center gap-2.5 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <Lightbulb className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <h4 className="text-sm font-headline font-bold text-gray-900">Questions to Ask Them</h4>
                                    </div>
                                    <ul className="space-y-3">
                                        {(prep.company_research.questions_to_ask || []).map((q, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                                {q}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Skill Gaps */}
                    {prep.skill_gaps_to_address && prep.skill_gaps_to_address.length > 0 && (
                        <div className="glass-panel border border-amber-200 rounded-2xl p-6">
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </div>
                                <h4 className="text-sm font-headline font-bold text-gray-900">Prepare for These Gaps</h4>
                            </div>
                            <ul className="space-y-3">
                                {prep.skill_gaps_to_address.map((gap, i) => (
                                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2.5 leading-relaxed">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
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
