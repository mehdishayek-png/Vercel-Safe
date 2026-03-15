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
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#4f46e5', '#7c3aed', '#10b981'] });
        }
    };

    const handleCoverLetter = async () => {
        if (coverLetter) return; // Already generated
        setIsLoadingCoverLetter(true);
        try {
            const res = await fetch('/api/cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job, profile, apiKey: apiKeys?.OPENROUTER_API_KEY }),
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

    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
    };

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
            className="group bg-white border border-surface-200 hover:border-surface-300 rounded-xl transition-all duration-200 hover:shadow-card-hover"
        >
            {/* Top accent line */}
            <div className={`h-[2px] rounded-t-xl bg-gradient-to-r ${getMatchGradient(job.match_score)} opacity-0 group-hover:opacity-100 transition-opacity`} />

            <div className="p-5">
                <div className="flex justify-between items-start gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                            <CompanyLogo company={job.company} applyUrl={job.apply_url} size={32} colorIndex={0} />
                            <h3 className="text-[15px] font-semibold text-gray-900 truncate">
                                <Link
                                    href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                    onClick={() => {
                                        try {
                                            const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                            localStorage.setItem(key, JSON.stringify(job));
                                        } catch (e) { /* ignore quota errors */ }
                                    }}
                                    className="hover:text-brand-600 transition-colors"
                                >
                                    {cleanTitle}
                                </Link>
                            </h3>
                            {job.date_posted && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-50 text-gray-500 border border-surface-200 whitespace-nowrap shrink-0">
                                    {postedDate}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-500 mb-3">
                            <span className="flex items-center gap-1 text-gray-700 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                {cleanCompany}
                            </span>
                            <span className="w-px h-3 bg-surface-200" />
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {cleanLocation || 'Remote'}
                            </span>
                            <span className="w-px h-3 bg-surface-200" />
                            <span className="px-1.5 py-0.5 rounded-md bg-surface-50 text-gray-500 border border-surface-200 text-[10px] font-medium">
                                {job.source}
                            </span>
                        </div>

                        {/* Summary */}
                        <div className="relative">
                            <p className={`text-sm text-gray-500 leading-relaxed ${showFullDescription ? '' : 'line-clamp-2'}`}>
                                {cleanSummary}
                            </p>
                            {cleanSummary.length > 150 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowFullDescription(!showFullDescription); }}
                                    className="text-xs font-medium text-teal-600 hover:text-teal-700 mt-0.5 cursor-pointer"
                                >
                                    {showFullDescription ? 'Less' : 'More'}
                                </button>
                            )}
                        </div>

                        {/* Matched skill tags */}
                        {job.heuristic_breakdown?.matches?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                {job.heuristic_breakdown.matches.slice(0, 5).map((m, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-100 text-[10px] text-teal-700 font-medium">
                                        {m.skill}
                                    </span>
                                ))}
                                {job.heuristic_breakdown.matches.length > 5 && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] text-gray-400 bg-gray-50 border border-gray-100">
                                        +{job.heuristic_breakdown.matches.length - 5}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Score + Actions */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                        <MatchRing score={analysis?.fit_score || job.match_score} />
                        <div className="flex gap-1.5">
                            <button
                                onClick={handleSaveWrapper}
                                aria-label={isSaved ? 'Remove from saved' : 'Save job'}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    isSaved
                                        ? 'bg-brand-50 border-brand-200 text-brand-600'
                                        : 'bg-white border-surface-200 text-gray-400 hover:text-gray-600 hover:bg-surface-50'
                                }`}
                            >
                                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-brand-600' : ''}`} />
                            </button>
                            {onApply && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onApply(job); }}
                                    aria-label={isApplied ? 'Remove from applied' : 'Mark as applied'}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                        isApplied
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                            : 'bg-white border-surface-200 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
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
                                className="inline-flex items-center gap-1 bg-gray-900 hover:bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                                View <ChevronDown className="w-3 h-3 -rotate-90" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Analysis trigger */}
                <div className="mt-3 pt-3 border-t border-surface-100 flex justify-between items-center">
                    {analysis?.fit_score ? (
                        <div className="text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI: {analysis.fit_score}
                        </div>
                    ) : (
                        <div className="text-[11px] text-gray-400">Heuristic Match</div>
                    )}

                    <button
                        onClick={handleExpandWrapper}
                        className="group/btn flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-brand-600 transition-colors py-1 px-2 rounded-lg hover:bg-brand-50 cursor-pointer"
                    >
                        {analysis?.isBlurredTeaser ? (
                            <>
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-amber-600">Unlock</span>
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
                            <div className="pt-3 mt-3 border-t border-surface-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {isLoadingAnalysis ? (
                                    <div className="col-span-2 space-y-2 p-4">
                                        <div className="flex items-center gap-2 text-gray-400 animate-pulse">
                                            <BrainCircuit className="w-4 h-4" />
                                            <span>Analyzing against your profile...</span>
                                        </div>
                                        <div className="h-2 bg-surface-100 rounded-full w-3/4 animate-pulse" />
                                        <div className="h-2 bg-surface-100 rounded-full w-1/2 animate-pulse" />
                                    </div>
                                ) : analysis ? (
                                    <div className="relative col-span-2">
                                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${analysis.isBlurredTeaser ? 'blur-md pointer-events-none select-none opacity-40' : ''}`}>
                                            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                                <h4 className="text-emerald-800 font-medium mb-2 flex items-center gap-1.5">
                                                    <Check className="w-3.5 h-3.5" />
                                                    Strong Signals
                                                </h4>
                                                <ul className="list-disc list-inside space-y-1 text-emerald-700/80">
                                                    {analysis.strong_signals?.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-brand-50 p-3 rounded-lg border border-brand-100 flex flex-col justify-between">
                                                <div>
                                                    <h4 className="text-brand-800 font-medium mb-2 flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        AI Verdict
                                                    </h4>
                                                    <p className="text-brand-700/80 mb-2">{analysis.verdict}</p>
                                                </div>
                                                <div className="pt-2 border-t border-brand-100/50 mt-2">
                                                    <span className="text-[10px] uppercase tracking-wider text-brand-400 font-semibold">Est. Salary: </span>
                                                    <span className="text-brand-900 font-medium">{analysis.salary_estimate}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Heuristic breakdown */}
                                        {!analysis.isBlurredTeaser && job.heuristic_breakdown && (
                                            <div className="mt-3 border-t border-dashed border-surface-200 pt-3">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                    <BrainCircuit className="w-3.5 h-3.5 text-brand-400" />
                                                    Scoring Breakdown
                                                </h4>
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <div className="flex-1">
                                                        <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Keywords ({job.heuristic_breakdown.raw} pts)</div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {job.heuristic_breakdown.matches?.map((match, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 border border-brand-100 text-[10px] text-brand-700 font-medium">
                                                                    {match.skill}
                                                                    <span className="ml-1 text-brand-400 font-mono">+{match.value}</span>
                                                                </span>
                                                            ))}
                                                            {(!job.heuristic_breakdown.matches || job.heuristic_breakdown.matches.length === 0) && (
                                                                <span className="text-xs text-gray-400 italic">No direct skill overlaps.</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Match Signals</div>
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            {Object.entries(job.heuristic_breakdown.multipliers || {}).map(([key, val]) => {
                                                                const numVal = parseFloat(val);
                                                                // Convert raw multipliers to user-friendly labels
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
                                                                if (!label) return null; // Hide neutral/irrelevant signals
                                                                let colorClass = "bg-surface-50 text-gray-600 border-surface-200";
                                                                if (numVal > 1.0) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                                if (numVal < 1.0) colorClass = "bg-rose-50 text-rose-700 border-rose-200";
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

                                        {/* Cover Letter Generator */}
                                        {!analysis.isBlurredTeaser && (
                                            <div className="mt-3 border-t border-dashed border-surface-200 pt-3">
                                                {!coverLetter ? (
                                                    <button
                                                        onClick={handleCoverLetter}
                                                        disabled={isLoadingCoverLetter}
                                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-brand-600 transition-colors py-1.5 px-3 rounded-lg hover:bg-brand-50 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {isLoadingCoverLetter ? (
                                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                                                        ) : (
                                                            <><FileText className="w-3.5 h-3.5" /> Generate Cover Letter</>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <div className="bg-surface-50 rounded-lg border border-surface-200 p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <FileText className="w-3.5 h-3.5 text-brand-400" />
                                                                Cover Letter
                                                            </h4>
                                                            <button
                                                                onClick={handleCopy}
                                                                className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-brand-600 transition-colors px-2 py-1 rounded-md hover:bg-brand-50 cursor-pointer"
                                                            >
                                                                {copied ? <><CheckCheck className="w-3 h-3 text-emerald-500" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{coverLetter}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Paywall overlay — disabled during beta */}
                                        {false && analysis.isBlurredTeaser && (
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-white/60 rounded-xl">
                                                <Lock className="w-8 h-8 text-amber-500 mb-2" />
                                                <h4 className="text-base font-bold text-gray-900 mb-1">Free scans used</h4>
                                                <p className="text-sm text-gray-600 mb-3 max-w-xs">Unlock AI analysis, salary estimates, and skill gaps for 50 jobs.</p>
                                                <Button
                                                    onClick={initiatePayment}
                                                    disabled={isPaymentProcessing}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white border-0"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-1.5" />
                                                    {isPaymentProcessing ? 'Processing...' : 'Get 50 Tokens — ₹399'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="col-span-2 text-center text-red-500 py-4 bg-red-50 rounded-lg border border-red-100">
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
