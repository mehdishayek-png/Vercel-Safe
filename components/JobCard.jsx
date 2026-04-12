import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Building2, ExternalLink, ChevronDown, Check, Bookmark, Sparkles, BrainCircuit, AlertCircle, Loader2, Lock, FileText, Copy, CheckCheck, Send, FileEdit } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { Button } from './ui/Button';

import { CompanyLogo } from './ui/CompanyLogo';
import { getMatchColor as getMatchColorUtil, getMatchGradient as getMatchGradientUtil } from '@/lib/match-colors';
import { useRazorpay } from '../lib/useRazorpay';
import { useToast } from './ui/Toast';
import { safeBtoa } from '@/lib/safe-btoa';

export function JobCard({ job, profile, apiKeys, onSave, isSaved, onApply, isApplied, onTokensUpdated, autoAnalyze }) {
    const toast = useToast();
    const sendFeedback = (action) => {
        try {
            fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job: { title: job.title || '', company: job.company || '' },
                    action,
                    pandaScore: job.match_score || job._localScore || 0,
                    profile: { headline: profile?.headline || '' }
                })
            }).catch(() => {});
        } catch (e) { /* ignore */ }
    };

    const handleSaveWrapper = () => {
        onSave(job);
        if (!isSaved) sendFeedback('save');
        if (!isSaved && job.match_score >= 80) {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#4f46e5', '#7c3aed', '#10b981'] });
        }
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
        return html
            // Decode entities first (handles double-encoded HTML)
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
            // Strip tags
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>?/gm, '')
            // Second decode pass for remaining entities
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
    };

    const cleanTitle = stripHtml(job.title);
    const cleanCompany = stripHtml(job.company);
    const cleanLocation = stripHtml(job.location);
    const cleanSummary = stripHtml(job.summary || job.description);


    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="group glass-panel border border-transparent rounded-[2rem] transition-all duration-200 hover:shadow-xl"
        >
            {/* Top accent line */}
            <div className={`h-[2px] rounded-t-[2rem] bg-gradient-to-r ${getMatchGradientUtil(job.match_score)} opacity-0 group-hover:opacity-100 transition-opacity`} />

            <div className="p-4 sm:p-5">
                <div className="flex justify-between items-start gap-3 sm:gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Title row — logo + title on own line, badges wrap below on mobile */}
                        <div className="flex items-start gap-2 sm:gap-2.5 mb-1.5">
                            <CompanyLogo company={job.company} applyUrl={job.apply_url} size={32} colorIndex={0} />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-[15px] font-semibold text-gray-900 line-clamp-2 sm:truncate leading-snug">
                                    <Link
                                        href={`/dashboard/job/${encodeURIComponent(safeBtoa(job.apply_url || job.title))}`}
                                        onClick={() => {
                                            try {
                                                const key = `job_detail_${safeBtoa(job.apply_url || job.title)}`;
                                                localStorage.setItem(key, JSON.stringify(job));
                                            } catch (e) { /* ignore quota errors */ }
                                        }}
                                        className="hover:text-brand-600 transition-colors"
                                    >
                                        {cleanTitle}
                                    </Link>
                                </h3>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {job.date_posted && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-50 text-gray-500 border border-outline-variant/10 whitespace-nowrap shrink-0">
                                            {postedDate}
                                        </span>
                                    )}
                                    {job._pendingAnalysis ? (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 bg-brand-50 text-brand-500 border border-brand-100 animate-pulse">
                                            Analyzing...
                                        </span>
                                    ) : job.match_score >= 75 ? (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            High Match
                                        </span>
                                    ) : job.match_score >= 50 ? (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 bg-teal-50 text-teal-700 border border-teal-100">
                                            Good Match
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 bg-gray-50 text-gray-600 border border-gray-200">
                                            Worth a Look
                                        </span>
                                    )}
                                </div>
                            </div>
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
                        </div>

                        {/* TL;DR from AI analysis (shown instead of raw JD when available) */}
                        {(job.analysis?.tldr) && (
                            <p className="text-sm text-gray-700 leading-relaxed mb-1.5 italic">
                                {job.analysis.tldr}
                            </p>
                        )}

                        {/* Raw Summary */}
                        <div className="relative">
                            <p className={`text-sm text-gray-500 leading-relaxed ${(job.analysis?.tldr) ? 'line-clamp-1' : showFullDescription ? '' : 'line-clamp-2'}`}>
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
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] text-gray-400 bg-gray-50 border border-outline-variant/10">
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
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-w-[52px] h-[52px] px-2 rounded-xl border bg-white border-gray-200 shadow-sm">
                                <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Score</span>
                                <span className={`text-[15px] font-bold ${(analysis?.fit_score || job.match_score) >= 75 ? 'text-emerald-600' : (analysis?.fit_score || job.match_score) >= 50 ? 'text-teal-600' : 'text-gray-500'}`}>
                                    {Math.round(analysis?.fit_score || job.match_score)}
                                </span>
                            </div>
                        )}
                        <div className="flex gap-1.5">
                            <button
                                onClick={handleSaveWrapper}
                                aria-label={isSaved ? 'Remove from saved' : 'Save job'}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    isSaved
                                        ? 'bg-brand-50 border-brand-200 text-brand-600'
                                        : 'bg-white/60 border-transparent text-gray-400 hover:text-gray-600 hover:bg-surface-50'
                                }`}
                            >
                                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-brand-600' : ''}`} />
                            </button>
                            {onApply && (
                                <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        onApply(job); 
                                        if (!isApplied) sendFeedback('apply');
                                    }}
                                    aria-label={isApplied ? 'Remove from applied' : 'Mark as applied'}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                        isApplied
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                            : 'bg-white/60 border-transparent text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                    title={isApplied ? 'Applied' : 'Mark as Applied'}
                                >
                                    <Check className={`w-3.5 h-3.5 ${isApplied ? 'stroke-[3]' : ''}`} />
                                </button>
                            )}
                            <Link
                                href={`/dashboard/job/${encodeURIComponent(safeBtoa(job.apply_url || job.title))}`}
                                onClick={() => {
                                    try {
                                        const key = `job_detail_${safeBtoa(job.apply_url || job.title)}`;
                                        localStorage.setItem(key, JSON.stringify(job));
                                    } catch (e) { /* ignore */ }
                                }}
                                className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[13px] px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow"
                            >
                                <BrainCircuit className="w-3.5 h-3.5 text-teal-400" />
                                Analyze Role
                            </Link>
                        </div>
                    </div>
                </div>


            </div>
        </motion.div>
    );
}
