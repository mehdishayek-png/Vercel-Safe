'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Bookmark, Check, MapPin, Building2, Clock, Sparkles, BrainCircuit, FileText, Copy, CheckCheck, Loader2, AlertCircle, Briefcase, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/components/ui/Toast';
import { MatchRing } from '@/components/ui/MatchRing';

function multiplierToDots(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return 3;
    if (num >= 1.1) return 5;
    if (num >= 1.0) return 4;
    if (num >= 0.8) return 3;
    if (num >= 0.5) return 2;
    return 1;
}

function DotIndicator({ filled, total = 5 }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        i < filled ? 'bg-brand-500' : 'bg-surface-200'
                    }`}
                />
            ))}
        </div>
    );
}

function RelevanceRow({ label, dots, children }) {
    return (
        <div className="py-4 border-b border-surface-100 last:border-0">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-800">{label}</span>
                <DotIndicator filled={dots} />
            </div>
            {children && <div className="text-xs text-gray-500 mt-1">{children}</div>}
        </div>
    );
}

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const toast = useToast();
    const { savedJobIds, toggleSaveJob, appliedJobIds, toggleAppliedJob, profile, apiKeys } = useApp();
    const [job, setJob] = useState(null);
    const [coverLetter, setCoverLetter] = useState(null);
    const [isLoadingCoverLetter, setIsLoadingCoverLetter] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        try {
            const id = decodeURIComponent(params.id);
            const stored = localStorage.getItem(`job_detail_${id}`);
            if (stored) {
                setJob(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load job detail:', e);
        }
    }, [params.id]);

    if (!job) {
        return (
            <div className="max-w-3xl mx-auto py-16 text-center">
                <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Not Found</h3>
                <p className="text-sm text-gray-500 mb-6">This job may have expired or the link is invalid.</p>
                <Link href="/dashboard/search" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Search
                </Link>
            </div>
        );
    }

    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
    };

    const isSaved = savedJobIds.has(job.apply_url);
    const isApplied = appliedJobIds.has(job.apply_url);
    const score = job.analysis?.fit_score || job.match_score || 0;
    const multipliers = job.heuristic_breakdown?.multipliers || {};
    const matches = job.heuristic_breakdown?.matches || [];
    const analysis = job.analysis;

    // Compute top stats
    const skillCount = matches.length;
    const experienceYears = job.heuristic_breakdown?.experience_years || null;

    // Build relevance sections from multipliers
    const relevanceSections = [
        {
            label: 'Skill Relevance',
            key: 'semantic',
            fallback: 'depth',
            detail: skillCount > 0 ? `${skillCount} matched skill${skillCount !== 1 ? 's' : ''}: ${matches.slice(0, 6).map(m => m.skill).join(', ')}` : 'No direct skill overlaps detected',
        },
        {
            label: 'Title Relevance',
            key: 'coherence',
            fallback: 'roleFamily',
            detail: `Comparing your title against "${stripHtml(job.title)}"`,
        },
        {
            label: 'Experience Relevance',
            key: 'seniority',
            detail: experienceYears ? `${experienceYears} years experience detected` : 'Experience level comparison',
        },
        {
            label: 'Location Match',
            key: 'location',
            detail: stripHtml(job.location) || 'Remote / Not specified',
        },
        {
            label: 'Seniority Fit',
            key: 'seniority',
            detail: multipliers.seniority >= 1.1 ? 'Great fit for your level' : multipliers.seniority >= 0.8 ? 'Slight stretch' : 'May be a reach',
        },
        {
            label: 'Career Track',
            key: 'roleFamily',
            detail: multipliers.roleFamily >= 1.0 ? 'Aligned with your career path' : multipliers.roleFamily >= 0.6 ? 'Adjacent field' : 'Different career track',
        },
    ];

    const handleCoverLetter = async () => {
        if (coverLetter) return;
        setIsLoadingCoverLetter(true);
        try {
            const res = await fetch('/api/cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job, profile, apiKey: apiKeys?.OPENROUTER_API_KEY }),
            });
            if (!res.ok) throw new Error('Failed to generate');
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

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to results
            </button>

            {/* Job header */}
            <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-card">
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-gray-900 mb-2">{stripHtml(job.title)}</h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5 font-medium text-gray-700">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                {stripHtml(job.company)}
                            </span>
                            <span className="w-px h-4 bg-surface-200" />
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {stripHtml(job.location) || 'Remote'}
                            </span>
                            {job.source && (
                                <>
                                    <span className="w-px h-4 bg-surface-200" />
                                    <span className="px-2 py-0.5 rounded-md bg-surface-50 text-gray-500 border border-surface-200 text-xs font-medium">
                                        {job.source}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <MatchRing score={score} />
                </div>

                {/* Three big stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl p-4 text-white text-center">
                        <div className="text-2xl font-extrabold">{experienceYears || '--'}</div>
                        <div className="text-xs font-medium text-brand-100 mt-1">Years Experience</div>
                    </div>
                    <div className="bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl p-4 text-white text-center">
                        <div className="text-2xl font-extrabold">{skillCount}</div>
                        <div className="text-xs font-medium text-accent-100 mt-1">Relevant Skills</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 text-white text-center">
                        <div className="text-2xl font-extrabold">{score}%</div>
                        <div className="text-xs font-medium text-emerald-100 mt-1">Match Score</div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (job.apply_url) {
                                window.open(job.apply_url, '_blank');
                            } else {
                                const q = encodeURIComponent(`${job.title} ${job.company} apply`);
                                window.open(`https://www.google.com/search?q=${q}`, '_blank');
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    >
                        Apply Now <ExternalLink className="w-4 h-4 opacity-60" />
                    </button>
                    <button
                        onClick={() => toggleSaveJob(job)}
                        className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                            isSaved
                                ? 'bg-brand-50 border-brand-200 text-brand-600'
                                : 'bg-white border-surface-200 text-gray-500 hover:text-brand-600 hover:border-brand-200'
                        }`}
                    >
                        <Bookmark className={`w-4 h-4 inline mr-1.5 ${isSaved ? 'fill-brand-600' : ''}`} />
                        {isSaved ? 'Saved' : 'Save'}
                    </button>
                    <button
                        onClick={() => toggleAppliedJob(job)}
                        className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                            isApplied
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                : 'bg-white border-surface-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200'
                        }`}
                    >
                        <Check className={`w-4 h-4 inline mr-1.5 ${isApplied ? 'stroke-[3]' : ''}`} />
                        {isApplied ? 'Applied' : 'Mark Applied'}
                    </button>
                </div>
            </div>

            {/* Relevance Breakdown */}
            <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-card">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-brand-500" />
                    Relevance Breakdown
                </h2>
                <p className="text-xs text-gray-400 mb-4">How well this job matches your profile</p>

                <div>
                    {relevanceSections.map((section) => {
                        const val = multipliers[section.key] ?? multipliers[section.fallback] ?? 0.8;
                        const dots = multiplierToDots(val);
                        return (
                            <RelevanceRow key={section.label} label={section.label} dots={dots}>
                                {section.detail}
                            </RelevanceRow>
                        );
                    })}
                </div>

                {/* Matched skills pills */}
                {matches.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-surface-100">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Matched Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {matches.map((m, i) => (
                                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-100 text-xs text-brand-700 font-medium">
                                    {m.skill}
                                    <span className="ml-1.5 text-brand-400 font-mono text-[10px]">+{m.value}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-card">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Job Description</h2>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {stripHtml(job.description || job.summary || 'No description available.')}
                </div>
            </div>

            {/* AI Analysis */}
            {analysis && !analysis.isBlurredTeaser && (
                <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-card space-y-4">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-500" />
                        AI Analysis
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strong Signals */}
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <h3 className="text-emerald-800 font-semibold text-sm mb-2 flex items-center gap-1.5">
                                <Check className="w-4 h-4" />
                                Strong Signals
                            </h3>
                            <ul className="list-disc list-inside space-y-1.5 text-xs text-emerald-700/80">
                                {analysis.strong_signals?.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>

                        {/* Gaps */}
                        {analysis.gaps?.length > 0 && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <h3 className="text-amber-800 font-semibold text-sm mb-2 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4" />
                                    Gaps to Address
                                </h3>
                                <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-700/80">
                                    {analysis.gaps?.map((g, i) => <li key={i}>{g}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Verdict */}
                    <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                        <h3 className="text-brand-800 font-semibold text-sm mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            Verdict
                        </h3>
                        <p className="text-sm text-brand-700/80">{analysis.verdict}</p>
                        {analysis.salary_estimate && (
                            <div className="mt-3 pt-3 border-t border-brand-100/50">
                                <span className="text-[10px] uppercase tracking-wider text-brand-400 font-semibold">Est. Salary: </span>
                                <span className="text-brand-900 font-semibold text-sm">{analysis.salary_estimate}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cover Letter */}
            <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-card">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-500" />
                    Cover Letter
                </h2>

                {!coverLetter ? (
                    <button
                        onClick={handleCoverLetter}
                        disabled={isLoadingCoverLetter}
                        className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors py-2 px-4 rounded-lg hover:bg-brand-50 cursor-pointer disabled:opacity-50"
                    >
                        {isLoadingCoverLetter ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                            <><FileText className="w-4 h-4" /> Generate Cover Letter</>
                        )}
                    </button>
                ) : (
                    <div>
                        <div className="flex items-center justify-end mb-3">
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-brand-600 transition-colors px-3 py-1.5 rounded-md hover:bg-brand-50 cursor-pointer"
                            >
                                {copied ? <><CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                            </button>
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-surface-50 rounded-xl p-4 border border-surface-200">
                            {coverLetter}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
