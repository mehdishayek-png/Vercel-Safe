import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Building2, ExternalLink, ChevronDown, Check, Bookmark, Sparkles, BrainCircuit, AlertCircle, Loader2, Lock, FileText, Copy, CheckCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { Button } from './ui/Button';
import { MatchRing } from './ui/MatchRing';
import { CompanyLogo } from './ui/CompanyLogo';
import { getMatchColor as getMatchColorUtil, getMatchGradient as getMatchGradientUtil } from '@/lib/match-colors';
import { useRazorpay } from '../lib/useRazorpay';
import { useToast } from './ui/Toast';
import { stripHtmlForDisplay as stripHtmlShared } from '@/lib/strip-html';

export function JobCard({ job, profile, apiKeys, onSave, isSaved, onApply, isApplied, onTokensUpdated }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [coverLetter, setCoverLetter] = useState(null);
    const [isLoadingCoverLetter, setIsLoadingCoverLetter] = useState(false);
    const [copied, setCopied] = useState(false);
    const toast = useToast();
    const { initiatePayment, isProcessing: isPaymentProcessing } = useRazorpay({
        onSuccess: () => {
            toast('50 tokens credited!', 'success');
            onTokensUpdated?.();
        },
        onError: (err) => toast(err.message, 'error'),
    });

    const handleSaveWrapper = () => {
        onSave(job);
        if (!isSaved && job.match_score >= 80) {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#C8962E', '#F5B731', '#059669'] });
        }
    };

    const handleCoverLetter = async () => {
        if (coverLetter) return;
        setIsLoadingCoverLetter(true);
        try {
            const res = await fetch('/api/cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job, profile }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to generate');
            }
            const data = await res.json();
            setCoverLetter(data.letter);
        } catch (err) {
            toast(err.message || 'Cover letter failed', 'error');
        } finally {
            setIsLoadingCoverLetter(false);
        }
    };

    const handleCopy = async () => {
        if (!coverLetter) return;
        await navigator.clipboard.writeText(coverLetter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getFormattedDate = (dateString) => {
        if (!dateString) return 'Recently';
        if (typeof dateString === 'string') {
            if (dateString === 'Invalid Date') return 'Recently';
            if (dateString.toLowerCase().includes('ago') || dateString.toLowerCase().includes('recently') || dateString.toLowerCase().includes('today')) return dateString;
        }
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    const postedDate = getFormattedDate(job.date_posted);

    const stripHtml = stripHtmlShared;

    const cleanTitle = stripHtml(job.title);
    const cleanCompany = stripHtml(job.company);
    const cleanLocation = stripHtml(job.location);
    const cleanSummary = stripHtml(job.summary || job.description);

    const getMatchColor = (score) => getMatchColorUtil(score).text;
    const getMatchGradient = (score) => getMatchGradientUtil(score);

    const handleExpandWrapper = async (e) => {
        e.stopPropagation();

        if (!isExpanded) {
            setIsExpanded(true);
            if (!analysis && !isLoadingAnalysis) {
                setIsLoadingAnalysis(true);
                setAnalysisError(null);
                try {
                    const res = await fetch('/api/analyze-job', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ job, profile, apiKeys }),
                    });
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        if (res.status === 401 && errorData.requiresAuth) {
                            setAnalysisError('Sign in to use Deep Scan.');
                        } else if (res.status === 403 && errorData.paywalled) {
                            setAnalysis({ isBlurredTeaser: true, fit_score: '??', strong_signals: ['Hidden'], gaps: ['Hidden'], salary_estimate: 'Hidden', verdict: 'Purchase tokens to unlock this analysis.' });
                        } else {
                            throw new Error(errorData.error || 'Failed to analyze job');
                        }
                        return;
                    }
                    const data = await res.json();
                    setAnalysis(data.analysis);
                    onTokensUpdated?.();
                } catch (err) {
                    console.error("Analysis Error:", err);
                    setAnalysisError(err.message || 'Error communicating with AI service.');
                } finally {
                    setIsLoadingAnalysis(false);
                }
            }
        } else {
            setIsExpanded(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="group bg-white dark:bg-[#1C1B19] border border-ink-200 dark:border-ink-800 hover:border-ink-300 dark:hover:border-ink-700 rounded-[10px] transition-all duration-200 hover:shadow-card-hover"
        >
            {/* Top accent line */}
            <div className={`h-[2px] rounded-t-[10px] bg-gradient-to-r ${getMatchGradient(job.match_score)} opacity-0 group-hover:opacity-100 transition-opacity`} />

            <div className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-3 sm:gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 sm:gap-2.5 mb-1.5">
                            <CompanyLogo company={job.company} applyUrl={job.apply_url} size={32} colorIndex={0} />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-[15px] font-semibold text-ink-900 dark:text-ink-100 line-clamp-2 sm:truncate leading-snug">
                                    <Link
                                        href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                        onClick={() => {
                                            try {
                                                const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                                localStorage.setItem(key, JSON.stringify(job));
                                            } catch (e) { /* ignore quota errors */ }
                                        }}
                                        className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                    >
                                        {cleanTitle}
                                    </Link>
                                </h3>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {job.date_posted && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-50 dark:bg-ink-900 text-ink-500 border border-ink-200 dark:border-ink-800 whitespace-nowrap shrink-0">
                                            {postedDate}
                                        </span>
                                    )}
                                    {job._pendingAnalysis ? (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 animate-pulse">
                                            Analyzing...
                                        </span>
                                    ) : job.match_score >= 80 ? (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                            Strong Match
                                        </span>
                                    ) : job.match_score >= 60 ? (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                                            Good Match
                                        </span>
                                    ) : job.match_score >= 40 ? (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                            Fair Match
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-ink-500 dark:text-ink-400 mb-3">
                            <span className="flex items-center gap-1 text-ink-700 dark:text-ink-300 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-ink-400" />
                                {cleanCompany}
                            </span>
                            <span className="w-px h-3 bg-ink-200 dark:bg-ink-800" />
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-ink-400" />
                                {cleanLocation || 'Remote'}
                            </span>
                            <span className="w-px h-3 bg-ink-200 dark:bg-ink-800" />
                            <span className="px-1.5 py-0.5 rounded-md bg-surface-50 dark:bg-ink-900 text-ink-500 border border-ink-200 dark:border-ink-800 text-[10px] font-medium">
                                {job.source}
                            </span>
                        </div>

                        {(job.analysis?.tldr) && (
                            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed mb-1.5 italic">
                                {job.analysis.tldr}
                            </p>
                        )}

                        <div className="relative">
                            <p className={`text-sm text-ink-500 dark:text-ink-400 leading-relaxed ${(job.analysis?.tldr) ? 'line-clamp-1' : showFullDescription ? '' : 'line-clamp-2'}`}>
                                {cleanSummary}
                            </p>
                            {cleanSummary.length > 150 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowFullDescription(!showFullDescription); }}
                                    className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 mt-0.5 cursor-pointer"
                                >
                                    {showFullDescription ? 'Less' : 'More'}
                                </button>
                            )}
                        </div>

                        {job.heuristic_breakdown?.matches?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                {job.heuristic_breakdown.matches.slice(0, 5).map((m, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/40 text-[10px] text-brand-700 dark:text-brand-400 font-medium">
                                        {m.skill}
                                    </span>
                                ))}
                                {job.heuristic_breakdown.matches.length > 5 && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] text-ink-400 bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-800">
                                        +{job.heuristic_breakdown.matches.length - 5}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Score + Actions */}
                    <div className="flex flex-col items-center gap-1.5 sm:gap-2 shrink-0">
                        {job._pendingAnalysis ? (
                            <div className="w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] flex items-center justify-center">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
                            </div>
                        ) : (
                            <div className="scale-90 sm:scale-100">
                                <MatchRing score={analysis?.fit_score || job.match_score} />
                            </div>
                        )}
                        <div className="flex gap-1.5">
                            <button
                                onClick={handleSaveWrapper}
                                aria-label={isSaved ? 'Remove from saved' : 'Save job'}
                                className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                                    isSaved
                                        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400'
                                        : 'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-800 text-ink-400 hover:text-ink-600 hover:bg-surface-50'
                                }`}
                            >
                                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-brand-600 dark:fill-brand-400' : ''}`} />
                            </button>
                            {onApply && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onApply(job); }}
                                    aria-label={isApplied ? 'Remove from applied' : 'Mark as applied'}
                                    className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                                        isApplied
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-800 text-ink-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                    title={isApplied ? 'Applied' : 'Mark as Applied'}
                                >
                                    <Check className={`w-3.5 h-3.5 ${isApplied ? 'stroke-[3]' : ''}`} />
                                </button>
                            )}
                            <Link
                                href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                onClick={() => {
                                    try {
                                        const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                        localStorage.setItem(key, JSON.stringify(job));
                                    } catch (e) { /* ignore */ }
                                }}
                                className="inline-flex items-center gap-1 bg-ink-900 dark:bg-brand-500 hover:bg-ink-800 dark:hover:bg-brand-600 text-white dark:text-ink-950 text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
                            >
                                View <ChevronDown className="w-3 h-3 -rotate-90" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Analysis trigger */}
                <div className="mt-3 pt-3 border-t border-ink-100 dark:border-ink-800 flex justify-between items-center">
                    {analysis?.fit_score ? (
                        <div className="text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI: {Math.round(analysis.fit_score)}
                        </div>
                    ) : (
                        <div className="text-[11px] text-ink-400">Heuristic Match</div>
                    )}

                    <button
                        onClick={handleExpandWrapper}
                        className="group/btn flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors py-1 px-2 rounded-md hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer"
                    >
                        {analysis?.isBlurredTeaser ? (
                            <>
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-amber-600 dark:text-amber-400">Unlock</span>
                            </>
                        ) : (
                            <>
                                <BrainCircuit className="w-3.5 h-3.5" />
                                {isExpanded ? 'Hide' : (job.analysis ? 'View AI Verdict' : 'Deep Analysis')}
                            </>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Expanded Analysis */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3 mt-3 border-t border-ink-100 dark:border-ink-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {isLoadingAnalysis ? (
                                    <div className="col-span-2 space-y-2 p-4">
                                        <div className="flex items-center gap-2 text-ink-400 animate-pulse">
                                            <BrainCircuit className="w-4 h-4" />
                                            <span>Analyzing against your profile...</span>
                                        </div>
                                        <div className="h-2 bg-ink-100 dark:bg-ink-800 rounded-full w-3/4 animate-pulse" />
                                        <div className="h-2 bg-ink-100 dark:bg-ink-800 rounded-full w-1/2 animate-pulse" />
                                    </div>
                                ) : analysis ? (
                                    <div className="relative col-span-2">
                                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${analysis.isBlurredTeaser ? 'blur-md pointer-events-none select-none opacity-40' : ''}`}>
                                            <div className="bg-emerald-50 dark:bg-emerald-900/15 p-3 rounded-[10px] border border-emerald-200 dark:border-emerald-800">
                                                <h4 className="text-emerald-800 dark:text-emerald-300 font-medium mb-2 flex items-center gap-1.5">
                                                    <Check className="w-3.5 h-3.5" />
                                                    Strong Signals
                                                </h4>
                                                <ul className="list-disc list-inside space-y-1 text-emerald-700/80 dark:text-emerald-400/80">
                                                    {analysis.strong_signals?.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-brand-50 dark:bg-brand-900/15 p-3 rounded-[10px] border border-brand-200 dark:border-brand-800 flex flex-col justify-between">
                                                <div>
                                                    <h4 className="text-brand-800 dark:text-brand-300 font-medium mb-2 flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        AI Verdict
                                                    </h4>
                                                    <p className="text-brand-700/80 dark:text-brand-400/80 mb-2">{analysis.verdict}</p>
                                                </div>
                                                <div className="pt-2 border-t border-brand-200/50 dark:border-brand-800/50 mt-2">
                                                    <span className="text-[10px] uppercase tracking-wider text-brand-400 font-semibold">Est. Salary: </span>
                                                    <span className="text-brand-900 dark:text-brand-200 font-medium">{analysis.salary_estimate}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {!analysis.isBlurredTeaser && job.heuristic_breakdown && (
                                            <div className="mt-3 border-t border-dashed border-ink-200 dark:border-ink-800 pt-3">
                                                <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                    <BrainCircuit className="w-3.5 h-3.5 text-brand-500" />
                                                    Scoring Breakdown
                                                </h4>
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <div className="flex-1">
                                                        <div className="text-[10px] text-ink-400 uppercase font-semibold mb-1.5">Keywords ({job.heuristic_breakdown.raw} pts)</div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {job.heuristic_breakdown.matches?.map((match, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/40 text-[10px] text-brand-700 dark:text-brand-400 font-medium">
                                                                    {match.skill}
                                                                    <span className="ml-1 text-brand-400 dark:text-brand-500 font-mono">+{match.value}</span>
                                                                </span>
                                                            ))}
                                                            {(!job.heuristic_breakdown.matches || job.heuristic_breakdown.matches.length === 0) && (
                                                                <span className="text-xs text-ink-400 italic">No direct skill overlaps.</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-[10px] text-ink-400 uppercase font-semibold mb-1.5">Match Signals</div>
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            {Object.entries(job.heuristic_breakdown.multipliers || {}).map(([key, val]) => {
                                                                const numVal = parseFloat(val);
                                                                const labels = {
                                                                    seniority: numVal >= 1.1 ? 'Seniority: Great fit' : numVal >= 0.8 ? 'Seniority: Slight stretch' : numVal >= 0.4 ? 'Seniority: Reach' : 'Seniority: Mismatch',
                                                                    recency: numVal >= 1.0 ? 'Posted: Fresh' : numVal >= 0.7 ? 'Posted: Recent' : numVal >= 0.4 ? 'Posted: Aging' : 'Posted: Old',
                                                                    prestige: numVal > 1.0 ? 'Company: Well-known' : 'Company: Neutral',
                                                                    location: numVal >= 1.3 ? 'Location: Exact match' : numVal >= 1.0 ? 'Location: Good' : numVal >= 0.5 ? 'Location: Remote' : numVal >= 0.1 ? 'Location: Partial' : 'Location: Mismatch',
                                                                    quality: numVal >= 1.0 ? 'Quality: Good' : 'Quality: Low',
                                                                    depth: numVal >= 1.1 ? 'Depth: Strong' : numVal >= 0.9 ? 'Depth: Neutral' : 'Depth: Basic role',
                                                                    roleFamily: numVal >= 1.0 ? 'Career track: Match' : numVal >= 0.6 ? 'Career track: Adjacent' : 'Career track: Different',
                                                                    negative: numVal >= 1.0 ? null : 'Flagged: Irrelevant',
                                                                    coherence: numVal >= 1.0 ? null : 'Title: Misleading',
                                                                    semantic: numVal >= 1.1 ? 'Semantic: Strong' : numVal >= 0.9 ? null : 'Semantic: Weak',
                                                                };
                                                                const label = labels[key];
                                                                if (!label) return null;
                                                                let colorClass = "bg-ink-50 dark:bg-ink-900 text-ink-600 dark:text-ink-300 border-ink-200 dark:border-ink-800";
                                                                if (numVal > 1.0) colorClass = "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
                                                                if (numVal < 1.0) colorClass = "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800";
                                                                return (
                                                                    <div key={key} className={`flex items-center px-2 py-1 rounded-md border text-[10px] font-medium ${colorClass}`}>
                                                                        <span>{label}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!analysis.isBlurredTeaser && (
                                            <div className="mt-3 border-t border-dashed border-ink-200 dark:border-ink-800 pt-3">
                                                {!coverLetter ? (
                                                    <button
                                                        onClick={handleCoverLetter}
                                                        disabled={isLoadingCoverLetter}
                                                        className="flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors py-1.5 px-3 rounded-md hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {isLoadingCoverLetter ? (
                                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                                                        ) : (
                                                            <><FileText className="w-3.5 h-3.5" /> Generate Cover Letter</>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <div className="bg-surface-50 dark:bg-ink-900 rounded-[10px] border border-ink-200 dark:border-ink-800 p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <FileText className="w-3.5 h-3.5 text-brand-500" />
                                                                Cover Letter
                                                            </h4>
                                                            <button
                                                                onClick={handleCopy}
                                                                className="flex items-center gap-1 text-[10px] font-medium text-ink-400 hover:text-brand-600 transition-colors px-2 py-1 rounded-md hover:bg-brand-50 cursor-pointer"
                                                            >
                                                                {copied ? <><CheckCheck className="w-3 h-3 text-emerald-500" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-ink-600 dark:text-ink-300 leading-relaxed whitespace-pre-wrap">{coverLetter}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {false && analysis.isBlurredTeaser && (
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-white/60 dark:bg-ink-950/60 rounded-[10px]">
                                                <Lock className="w-8 h-8 text-amber-500 mb-2" />
                                                <h4 className="text-base font-bold text-ink-900 dark:text-ink-100 mb-1">Free scans used</h4>
                                                <p className="text-sm text-ink-600 dark:text-ink-400 mb-3 max-w-xs">Unlock AI analysis, salary estimates, and skill gaps for 50 jobs.</p>
                                                <Button
                                                    onClick={initiatePayment}
                                                    disabled={isPaymentProcessing}
                                                    variant="accent"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-1.5" />
                                                    {isPaymentProcessing ? 'Processing...' : 'Get 50 Tokens \u2014 \u20B9399'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="col-span-2 text-center text-red-600 dark:text-red-400 py-4 bg-red-50 dark:bg-red-900/15 rounded-[10px] border border-red-200 dark:border-red-800">
                                        <AlertCircle className="w-4 h-4 inline mr-1.5" />
                                        {analysisError || "Unable to generate analysis."}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
