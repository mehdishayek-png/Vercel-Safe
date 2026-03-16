import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { MapPin, Calendar, Building2, ExternalLink, ChevronDown, Check, Bookmark, Sparkles, BrainCircuit, AlertCircle, Loader2, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from './ui/Button';
import { MatchRing } from './ui/MatchRing';
import { getMatchColor as getMatchColorUtil, getMatchGradient as getMatchGradientUtil, getMatchBadge } from '@/lib/match-colors';
import { useRazorpay } from '../lib/useRazorpay';
import { useToast } from './ui/Toast';

export function JobCard({ job, profile, apiKeys, onSave, isSaved, onTokensUpdated }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const toast = useToast();
    const { initiatePayment, isProcessing: isPaymentProcessing } = useRazorpay({
        onSuccess: () => {
            toast('✅ 50 tokens credited! Refresh your deep scans.', 'success');
            onTokensUpdated?.();
        },
        onError: (err) => toast(err.message, 'error'),
    });

    // 3D Tilt Logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const handleSaveWrapper = () => {
        onSave(job);
        if (!isSaved && job.match_score >= 80) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#3b82f6', '#fbbf24']
            });
        }
    };

    // Formatting helpers
    const getFormattedDate = (dateString) => {
        if (!dateString) return 'Recently';
        if (typeof dateString === 'string') {
            if (dateString === 'Invalid Date') return 'Recently';
            if (dateString.toLowerCase().includes('ago') || dateString.toLowerCase().includes('recently') || dateString.toLowerCase().includes('today')) {
                return dateString;
            }
        }
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    const postedDate = getFormattedDate(job.date_posted);

    // HTML Sanitization
    const stripHtml = (html) => {
        if (!html) return '';
        // Replace <br> with newlines, then strip tags
        const noTags = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
        // Decode entities briefly if needed, but simplistic strip is usually enough for basic display
        return noTags;
    };

    const cleanTitle = stripHtml(job.title);
    const cleanCompany = stripHtml(job.company);
    const cleanLocation = stripHtml(job.location);
    const cleanSummary = stripHtml(job.summary || job.description);

    // Confidence color logic — centralized in lib/match-colors.js
    const getMatchColor = (score) => getMatchColorUtil(score).text;
    const getMatchGradient = (score) => getMatchGradientUtil(score);

    const handleExpandWrapper = async (e) => {
        e.stopPropagation();

        if (!isExpanded) {
            setIsExpanded(true);

            // Only fire the calculation if we haven't already fetched it
            if (!analysis && !isLoadingAnalysis) {

                // Auth/paywall is handled server-side (admin bypass included)
                // No client-side localStorage check — server is the source of truth

                // Proceed with deep scan
                setIsLoadingAnalysis(true);
                setAnalysisError(null);

                try {
                    const res = await fetch('/api/analyze-job', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ job, profile, apiKeys }),
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        if (res.status === 401 && errorData.requiresAuth) {
                            setAnalysisError('Sign in to use Deep Scan.');
                        } else if (res.status === 403 && errorData.paywalled) {
                            // Show blurred teaser with purchase CTA
                            setAnalysis({ isBlurredTeaser: true, fit_score: '??', strong_signals: ['Hidden'], gaps: ['Hidden'], salary_estimate: 'Hidden', verdict: 'Purchase tokens to unlock this analysis.' });
                        } else {
                            throw new Error(errorData.error || 'Failed to analyze job');
                        }
                        return;
                    }

                    const data = await res.json();
                    setAnalysis(data.analysis);

                    // Token deduction is handled server-side — refresh balance
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
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative bg-white border border-gray-200 hover:border-blue-300 rounded-xl transition-all duration-300 hover:shadow-xl shadow-sm perspective-1000"
        >
            {/* Top Glow Line */}
            <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${getMatchGradient(job.match_score)} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {cleanTitle}
                            </h3>
                            {/* Match Quality Badge — Seekify-inspired */}
                            {(() => {
                                const badge = getMatchBadge(analysis?.fit_score || job.match_score);
                                return (
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${badge.bg} ${badge.text} ${badge.border}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                        {badge.label}
                                    </span>
                                );
                            })()}
                            {job.date_posted && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200 whitespace-nowrap">
                                    {postedDate}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-3">
                            <span className="flex items-center gap-1.5 text-gray-800 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                {cleanCompany}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="flex items-center gap-1.5 font-medium text-gray-700">
                                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                                {cleanLocation || 'Remote'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium border border-gray-200 shadow-sm">
                                {job.source}
                            </span>
                        </div>

                        {/* Summary */}
                        <div className="relative">
                            <p className={`text-sm text-gray-600 leading-relaxed transition-all duration-300 ${showFullDescription ? '' : 'line-clamp-3'}`}>
                                {cleanSummary}
                            </p>
                            {cleanSummary.length > 150 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowFullDescription(!showFullDescription); }}
                                    className="text-xs font-bold text-blue-800 hover:text-blue-950 underline decoration-blue-400 hover:decoration-blue-600 underline-offset-2 mt-1 focus:outline-none transition-all"
                                >
                                    {showFullDescription ? 'Show Less' : 'Read More'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Actions & Score */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 shrink-0 sm:border-0 border-t border-gray-100 sm:pt-0 pt-4" style={{ transform: "translateZ(20px)" }}>
                        <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                            <MatchRing score={analysis?.fit_score || job.match_score} />
                            <div className="text-[10px] sm:text-[9px] text-gray-500 sm:text-gray-400 uppercase tracking-widest font-bold sm:font-medium sm:mt-1">Match Fit</div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={handleSaveWrapper}
                                aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
                                className={`p-2 rounded-lg border transition-all ${isSaved ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600' : ''}`} />
                            </button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    if (job.apply_url) {
                                        window.open(job.apply_url, '_blank');
                                    } else {
                                        // Fallback: search Google for the job listing
                                        const searchQuery = encodeURIComponent(`${job.title} ${job.company} apply`);
                                        window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
                                    }
                                }}
                                className="bg-gray-900 hover:bg-black text-white border border-transparent shadow-sm px-4"
                            >
                                Apply <ExternalLink className="w-3 h-3 ml-1.5 opacity-50" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Deep Analysis Trigger - Clean & Simple */}
                {/* Deep Analysis Trigger - Clean & Simple */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    {/* AI Score Badge */}
                    {analysis?.fit_score ? (
                        <div className={`text-xs font-bold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1`}>
                            <Sparkles className="w-3 h-3" />
                            AI Score: {analysis.fit_score}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400">Heuristic Match</div>
                    )}

                    <button
                        onClick={handleExpandWrapper}
                        className="group flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors py-1 px-3 rounded-full hover:bg-blue-50"
                    >
                        {(() => {
                            if (analysis?.isBlurredTeaser) {
                                return (
                                    <>
                                        <Lock className="w-3.5 h-3.5 group-hover:text-amber-500 transition-colors" />
                                        <span className="text-amber-600 group-hover:text-amber-700">Unlock AI Verdict</span>
                                    </>
                                );
                            }
                            return (
                                <>
                                    <BrainCircuit className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                                    {isExpanded ? 'Hide Analysis' : (job.analysis ? 'View AI Verdict' : 'Generate Deep Analysis')}
                                </>
                            );
                        })()}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Expanded Analysis Panel */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-gray-100 mt-4"
                        >
                            <div className="pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {isLoadingAnalysis ? (
                                    <div className="col-span-2 space-y-2 p-4">
                                        <div className="flex items-center gap-2 text-gray-500 animate-pulse">
                                            <BrainCircuit className="w-4 h-4" />
                                            <span>Analyzing job details against your profile...</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                                        <div className="h-2 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                                    </div>
                                ) : analysis ? (
                                    <div className="relative">
                                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${analysis.isBlurredTeaser ? 'blur-md pointer-events-none select-none opacity-40' : ''}`}>
                                            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                                <h4 className="text-emerald-800 font-medium mb-2 flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5" />
                                                    Strong Signals
                                                </h4>
                                                <ul className="list-disc list-inside space-y-1 text-emerald-700/80">
                                                    {analysis.strong_signals?.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col justify-between">
                                                <div>
                                                    <h4 className="text-blue-800 font-medium mb-2 flex items-center gap-2">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        AI Verdict
                                                    </h4>
                                                    <p className="text-blue-700/80 mb-2">{analysis.verdict}</p>
                                                </div>
                                                <div className="pt-2 border-t border-blue-100/50 mt-2">
                                                    <span className="text-[10px] uppercase tracking-wider text-blue-500 font-bold">Est. Salary: </span>
                                                    <span className="text-blue-900 font-medium">{analysis.salary_estimate}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RPG Heuristic Math Breakdown (Scoring Architect) */}
                                        {!analysis.isBlurredTeaser && job.heuristic_breakdown && (
                                            <div className="mt-4 border-t border-dashed border-gray-200 pt-4 pb-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <BrainCircuit className="w-4 h-4 text-indigo-400" />
                                                    Panda Engine Math
                                                </h4>

                                                <div className="flex flex-col sm:flex-row gap-6">
                                                    {/* Skill Hits */}
                                                    <div className="flex-1">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Raw Keyword Base ({job.heuristic_breakdown.raw} pts)</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {job.heuristic_breakdown.matches?.map((match, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 border border-indigo-100/50 text-[10px] text-indigo-700 font-medium shadow-sm">
                                                                    {match.skill}
                                                                    <span className="ml-1.5 text-indigo-400/80 font-mono">+{match.value}</span>
                                                                </span>
                                                            ))}
                                                            {(!job.heuristic_breakdown.matches || job.heuristic_breakdown.matches.length === 0) && (
                                                                <span className="text-xs text-gray-400 italic">No direct hard-skill overlaps found.</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Compounding Multipliers */}
                                                    <div className="flex-1">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Compounding Multipliers</div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {Object.entries(job.heuristic_breakdown.multipliers || {}).map(([key, val]) => {
                                                                const numVal = parseFloat(val);
                                                                let colorClass = "bg-gray-50 text-gray-600 border-gray-200";
                                                                if (numVal > 1.0) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm";
                                                                if (numVal < 1.0) colorClass = "bg-rose-50 text-rose-700 border-rose-200";
                                                                return (
                                                                    <div key={key} className={`flex justify-between items-center px-2 py-1 rounded border text-[10px] font-medium ${colorClass}`}>
                                                                        <span className="capitalize">{key}</span>
                                                                        <span className="font-mono font-bold">{val}x</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {analysis.isBlurredTeaser && (
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-white/40 rounded-xl backdrop-blur-[2px]">
                                                <Lock className="w-10 h-10 text-amber-500 mb-3" />
                                                <h4 className="text-lg font-bold text-gray-900 mb-2">You've used your 5 Free Scans</h4>
                                                <p className="text-sm text-gray-800 mb-4 max-w-sm font-medium drop-shadow-sm">Unlock this job's precise match gaps, hidden signals, and salary estimates (along with 50 others) for just ₹399.</p>
                                                <Button
                                                    onClick={initiatePayment}
                                                    disabled={isPaymentProcessing}
                                                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg border-0 disabled:opacity-50"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    {isPaymentProcessing ? 'Processing...' : 'Get 50 Tokens — ₹399'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="col-span-2 text-center text-red-400 py-4 bg-red-50 rounded-lg border border-red-100">
                                        <AlertCircle className="w-4 h-4 inline mr-2" />
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
