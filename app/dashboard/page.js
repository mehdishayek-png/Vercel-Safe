'use client';
import { Search, Bookmark, Briefcase, TrendingUp, ArrowRight, Target, ChevronRight, Sparkles, Eye, Brain, FileText, ShieldCheck, Loader2, AlertCircle, Lightbulb, ChevronDown, ChevronUp, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useProfileStore } from '@/stores/profile-store';
import { useSearchStore } from '@/stores/search-store';
import { useJobsStore } from '@/stores/jobs-store';
import { useUser } from '@clerk/nextjs';
import { OnboardingPanel } from '@/components/dashboard/OnboardingPanel';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { safeBtoa } from '@/lib/safe-btoa';
import { safe } from '@/lib/safe-render';

function DotIndicator({ filled, total = 5 }) {
    return (
        <div className="flex items-center gap-[3px]">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`w-[6px] h-[6px] rounded-full ${
                        i < filled ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );
}

function scoreToDots(score) {
    if (score >= 85) return 5;
    if (score >= 70) return 4;
    if (score >= 55) return 3;
    if (score >= 25) return 2;
    return 1;
}

export default function DashboardHome() {
    const { user } = useUser();
    const {
        profile, isParsing, fileInputRef, setIsParsing, setProfile,
        experienceYears, setExperienceYears, jobTitle, setJobTitle,
    } = useProfileStore();
    const {
        jobs, addLog, preferences, setPreferences,
    } = useSearchStore();
    const {
        savedJobsData, appliedJobsData,
        toggleSaveJob, savedJobIds, toggleAppliedJob, appliedJobIds,
    } = useJobsStore();

    // --- Search Insights state ---
    const [insights, setInsights] = useState(null);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [insightsError, setInsightsError] = useState(null);

    // --- Resume Health state ---
    const [resumeHealth, setResumeHealth] = useState(null);
    const [isLoadingResumeHealth, setIsLoadingResumeHealth] = useState(false);
    const [resumeHealthError, setResumeHealthError] = useState(null);
    const [expandedWording, setExpandedWording] = useState({});

    const handleRefreshInsights = async () => {
        setIsLoadingInsights(true);
        setInsightsError(null);
        try {
            let savedJobs = savedJobsData;
            if (!savedJobs?.length) {
                try {
                    const stored = localStorage.getItem('midas_saved_jobs_data');
                    if (stored) savedJobs = JSON.parse(stored);
                } catch (e) { /* ignore */ }
            }
            let recentScanJobs = jobs;
            if (!recentScanJobs?.length) {
                try {
                    const stored = localStorage.getItem('midas_results');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        recentScanJobs = parsed.jobs || [];
                    }
                } catch (e) { /* ignore */ }
            }
            const res = await fetch('/api/career-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, savedJobs: savedJobs || [], recentScanJobs: recentScanJobs || [] }),
            });
            if (!res.ok) throw new Error('Failed to fetch insights');
            const data = await res.json();
            setInsights(data);
        } catch (err) {
            setInsightsError(err.message);
        } finally {
            setIsLoadingInsights(false);
        }
    };

    const handleCheckResumeHealth = async () => {
        setIsLoadingResumeHealth(true);
        setResumeHealthError(null);
        try {
            let targetJobs = savedJobsData;
            if (!targetJobs?.length) {
                try {
                    const stored = localStorage.getItem('midas_saved_jobs_data');
                    if (stored) targetJobs = JSON.parse(stored);
                } catch (e) { /* ignore */ }
            }
            const res = await fetch('/api/resume-gaps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, targetJobs: targetJobs || [] }),
            });
            if (!res.ok) throw new Error('Failed to check resume health');
            const data = await res.json();
            setResumeHealth(data);
        } catch (err) {
            setResumeHealthError(err.message);
        } finally {
            setIsLoadingResumeHealth(false);
        }
    };

    // Top 5 jobs from latest scan — sorted by AI score if available, then heuristic
    const topPicks = [...jobs]
        .sort((a, b) => (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0))
        .slice(0, 5);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsParsing(true);
        addLog("Parsing resume...");
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/parse-resume', { method: 'POST', body: formData });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to parse resume (${res.status})`);
            }
            const data = await res.json();
            setProfile(data.profile);
            if (typeof data.profile.experience_years === 'number') setExperienceYears(data.profile.experience_years);
            if (data.profile.headline) setJobTitle(data.profile.headline);
            addLog(`Profile extracted for ${data.profile.name}`);
        } catch (err) {
            addLog(`Warning: ${err.message}`);
        } finally {
            setIsParsing(false);
        }
    };

    const totalMatches = jobs.length;
    const savedCount = savedJobsData.length;
    const appliedCount = appliedJobsData.length;
    const avgScore = totalMatches > 0
        ? Math.round(jobs.reduce((sum, j) => sum + (j.analysis?.fit_score || j.match_score || 0), 0) / totalMatches)
        : 0;

    const recentApplied = appliedJobsData.slice(-5).reverse();

    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Recently';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="max-w-[1000px] space-y-6">
            {/* Greeting */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
                        {user?.firstName ? `Hi, ${user.firstName}` : profile ? `Hi, ${profile.name?.split(' ')[0] || 'there'}` : 'Welcome to Midas Match'}
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {profile
                            ? "Here's an overview of your job search activity."
                            : 'Upload your resume to get started.'}
                    </p>
                </div>
                <Link
                    href="/dashboard/search"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors"
                >
                    <Search className="w-3.5 h-3.5" /> New Search
                </Link>
            </div>

            {/* Upload panel for new users */}
            {!profile && (
                <div className="glass-card rounded-xl border border-outline-variant/10 p-6">
                    <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} />
                </div>
            )}

            {/* Stats row — inspired by JobZen/HirePath */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    {
                        label: 'Matches',
                        value: totalMatches,
                        icon: Target,
                        color: 'teal',
                        bg: 'bg-gradient-to-br from-teal-50 to-emerald-50/50',
                        iconBg: 'bg-teal-100',
                        iconColor: 'text-teal-600',
                        borderColor: 'border-teal-100',
                        sub: totalMatches > 0 ? 'From latest scan' : 'Run a scan',
                        trend: totalMatches > 0 ? `${totalMatches} found` : null,
                        trendUp: totalMatches > 0,
                    },
                    {
                        label: 'Saved',
                        value: savedCount,
                        icon: Bookmark,
                        color: 'sky',
                        bg: 'bg-gradient-to-br from-sky-50 to-blue-50/50',
                        iconBg: 'bg-sky-100',
                        iconColor: 'text-sky-600',
                        borderColor: 'border-sky-100',
                        sub: savedCount > 0 ? 'Jobs bookmarked' : 'None yet',
                        trend: savedCount > 0 ? `${savedCount} saved` : null,
                        trendUp: savedCount > 0,
                    },
                    {
                        label: 'Applied',
                        value: appliedCount,
                        icon: Briefcase,
                        color: 'violet',
                        bg: 'bg-gradient-to-br from-accent-50 to-accent-50/50',
                        iconBg: 'bg-accent-100',
                        iconColor: 'text-accent-600',
                        borderColor: 'border-accent-100',
                        sub: appliedCount > 0 ? 'Applications sent' : 'None yet',
                        trend: appliedCount > 0 ? `${appliedCount} tracked` : null,
                        trendUp: appliedCount > 0,
                    },
                    {
                        label: 'Avg Score',
                        value: avgScore || '—',
                        icon: TrendingUp,
                        color: 'amber',
                        bg: 'bg-gradient-to-br from-amber-50 to-orange-50/50',
                        iconBg: 'bg-amber-100',
                        iconColor: 'text-amber-600',
                        borderColor: 'border-amber-100',
                        sub: avgScore > 0 ? `${avgScore}/100 match` : 'No data',
                        trend: avgScore >= 70 ? 'Strong' : avgScore >= 50 ? 'Moderate' : null,
                        trendUp: avgScore >= 60,
                    },
                ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} rounded-xl border ${stat.borderColor} p-4 relative overflow-hidden`}>
                        {/* Subtle accent circle */}
                        <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full ${stat.iconBg} opacity-30`} />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{stat.label}</span>
                                <div className={`w-8 h-8 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                                    <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                                </div>
                            </div>
                            <div className="text-[28px] font-bold text-gray-900 leading-none">{stat.value}</div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-[11px] text-gray-400">{stat.sub}</p>
                                {stat.trend && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                        stat.trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {stat.trendUp ? '↑' : '·'} {stat.trend}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ===== SEARCH INSIGHTS ===== */}
            {profile && (
                <div className="glass-card rounded-xl border border-outline-variant/10 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/10">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                                <Brain className="w-3 h-3 text-white" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-semibold text-gray-900">Search Insights</h3>
                                <p className="text-[10px] text-gray-400">
                                    {safe(insights?.one_liner) || 'AI-powered analysis of your job search patterns'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {insights?.search_health && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    insights.search_health === 'on_track'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : insights.search_health === 'needs_adjustment'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {insights.search_health === 'on_track' ? 'On Track' : insights.search_health === 'needs_adjustment' ? 'Needs Adjustment' : 'Unfocused'}
                                </span>
                            )}
                            <button
                                onClick={handleRefreshInsights}
                                disabled={isLoadingInsights}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {isLoadingInsights ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {isLoadingInsights ? 'Analyzing...' : 'Refresh Insights'}
                            </button>
                        </div>
                    </div>

                    <div className="p-5">
                        {insightsError && (
                            <p className="text-[12px] text-red-500 mb-3">{insightsError}</p>
                        )}
                        {!insights && !isLoadingInsights ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-gray-300">Run a few scans and save some jobs, then check back for personalized insights.</p>
                            </div>
                        ) : isLoadingInsights && !insights ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your search patterns...
                            </div>
                        ) : insights?.insights?.length > 0 ? (
                            <div className="space-y-3">
                                {insights.insights.slice(0, 3).map((insight, i) => {
                                    const typeColors = {
                                        strength: 'bg-emerald-100 text-emerald-700',
                                        opportunity: 'bg-sky-100 text-sky-700',
                                        warning: 'bg-amber-100 text-amber-700',
                                        pattern: 'bg-accent-100 text-accent-700',
                                    };
                                    return (
                                        <div key={i} className="bg-gray-50 rounded-lg border border-outline-variant/10 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1">
                                                    {insight.type && (
                                                        <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-2 ${typeColors[insight.type] || typeColors.pattern}`}>
                                                            {safe(insight.type)}
                                                        </span>
                                                    )}
                                                    <p className="text-[13px] text-gray-700 leading-relaxed">{safe(insight.observation)}</p>
                                                    {insight.suggestion && (
                                                        <p className="text-[12px] text-gray-400 mt-1.5 flex items-start gap-1.5">
                                                            <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-400" />
                                                            {safe(insight.suggestion)}
                                                        </p>
                                                    )}
                                                </div>
                                                {insight.action?.type && insight.action.type !== 'none' && (
                                                    <button
                                                        onClick={() => {
                                                            if (insight.action.url) window.location.href = insight.action.url;
                                                        }}
                                                        className="shrink-0 px-3 py-1.5 text-[11px] font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        {insight.action.label || 'Take action'} <ArrowRight className="w-3 h-3 inline ml-0.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : insights ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-gray-300">Run a few scans and save some jobs, then check back for personalized insights.</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* ===== RESUME HEALTH ===== */}
            {profile && (
                <div className="glass-card rounded-xl border border-outline-variant/10 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/10">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                                <ShieldCheck className="w-3 h-3 text-white" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-semibold text-gray-900">Resume Health</h3>
                                <p className="text-[10px] text-gray-400">
                                    {safe(resumeHealth?.overall_readiness) || 'Check how your resume stacks up against saved jobs'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCheckResumeHealth}
                            disabled={isLoadingResumeHealth}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {isLoadingResumeHealth ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                            {isLoadingResumeHealth ? 'Checking...' : 'Check Resume Health'}
                        </button>
                    </div>

                    <div className="p-5">
                        {resumeHealthError && (
                            <p className="text-[12px] text-red-500 mb-3">{resumeHealthError}</p>
                        )}
                        {!profile?.skills?.length || (!savedJobsData?.length && !resumeHealth) ? (
                            !resumeHealth && !isLoadingResumeHealth ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-gray-300">Upload your resume and save some jobs first.</p>
                                </div>
                            ) : null
                        ) : null}
                        {isLoadingResumeHealth && !resumeHealth && (
                            <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your resume...
                            </div>
                        )}
                        {resumeHealth && (
                            <div className="space-y-5">
                                {/* Readiness Score Gauge */}
                                {typeof resumeHealth.readiness_score === 'number' && (
                                    <div className="flex items-center gap-5">
                                        <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
                                            <svg width={72} height={72} className="transform -rotate-90">
                                                <circle cx={36} cy={36} r={30} stroke="#f3f4f6" strokeWidth={5} fill="transparent" />
                                                <circle
                                                    cx={36} cy={36} r={30}
                                                    stroke={resumeHealth.readiness_score >= 75 ? '#14b8a6' : resumeHealth.readiness_score >= 55 ? '#f59e0b' : '#9ca3af'}
                                                    strokeWidth={5} fill="transparent"
                                                    strokeDasharray={30 * 2 * Math.PI}
                                                    strokeDashoffset={30 * 2 * Math.PI - (resumeHealth.readiness_score / 100) * 30 * 2 * Math.PI}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-[18px] font-bold" style={{ color: resumeHealth.readiness_score >= 75 ? '#14b8a6' : resumeHealth.readiness_score >= 55 ? '#f59e0b' : '#9ca3af' }}>
                                                    {Math.round(resumeHealth.readiness_score)}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Readiness Score</p>
                                            {resumeHealth.overall_readiness && (
                                                <p className="text-[13px] text-gray-700 mt-0.5">{safe(resumeHealth.overall_readiness)}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Missing High Impact Skills */}
                                {resumeHealth.missing_high_impact?.length > 0 && (
                                    <div>
                                        <h4 className="text-[12px] font-medium text-gray-700 mb-2.5 flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Missing Skills
                                        </h4>
                                        <div className="space-y-1.5">
                                            {resumeHealth.missing_high_impact.map((item, i) => {
                                                const priorityStyles = {
                                                    critical: 'bg-red-100 text-red-700',
                                                    recommended: 'bg-amber-100 text-amber-700',
                                                    nice_to_have: 'bg-gray-100 text-gray-500',
                                                };
                                                const priority = item.priority || 'recommended';
                                                return (
                                                    <div key={i} className="flex items-center gap-2 text-[12px]">
                                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${priorityStyles[priority] || priorityStyles.recommended}`}>
                                                            {priority.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-gray-700">{typeof item === 'string' ? item : safe(item.skill || item.name)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Wording Improvements */}
                                {resumeHealth.wording_improvements?.length > 0 && (
                                    <div>
                                        <h4 className="text-[12px] font-medium text-gray-700 mb-2.5 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-sky-500" /> Wording Improvements
                                        </h4>
                                        <div className="space-y-2">
                                            {resumeHealth.wording_improvements.map((item, i) => (
                                                <div key={i} className="border border-outline-variant/10 rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => setExpandedWording(prev => ({ ...prev, [i]: !prev[i] }))}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left cursor-pointer"
                                                    >
                                                        <span className="text-[12px] font-medium text-gray-700">{item.title || item.section || `Improvement ${i + 1}`}</span>
                                                        {expandedWording[i] ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                                    </button>
                                                    {expandedWording[i] && (
                                                        <div className="px-4 py-3 text-[12px] text-gray-600 leading-relaxed glass-card space-y-1.5">
                                                            {item.current && <p><span className="font-medium text-gray-500">Current:</span> {safe(item.current)}</p>}
                                                            {item.suggested && <p><span className="font-medium text-teal-600">Suggested:</span> {safe(item.suggested)}</p>}
                                                            {item.reason && <p className="text-[11px] text-gray-400">{safe(item.reason)}</p>}
                                                            {typeof item === 'string' && <p>{item}</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Red Flags */}
                                {resumeHealth.red_flags?.length > 0 && (
                                    <div>
                                        <h4 className="text-[12px] font-medium text-gray-700 mb-2.5 flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Red Flags
                                        </h4>
                                        <div className="space-y-2">
                                            {resumeHealth.red_flags.map((flag, i) => (
                                                <div key={i} className="bg-red-50/50 border border-red-200 rounded-lg p-3">
                                                    <p className="text-[12px] text-red-700 leading-relaxed">{typeof flag === 'string' ? flag : safe(flag.text || flag.issue)}</p>
                                                    {flag.fix && (
                                                        <p className="text-[11px] text-red-600/70/60 mt-1 flex items-start gap-1.5">
                                                            <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" /> {safe(flag.fix)}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== TOP PICKS — Best from latest scan ===== */}
            {profile && (
                <div className="glass-card rounded-xl border border-outline-variant/10 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/10">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-semibold text-gray-900">Top Picks</h3>
                                <p className="text-[10px] text-gray-400">Best matches from your latest scan</p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/search"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {topPicks.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm text-gray-400">Run a job search to see your top matches here</p>
                            <Link href="/dashboard/search" className="text-[12px] text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block">
                                Search Jobs
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {topPicks.map((job, i) => {
                                const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
                                const dots = scoreToDots(score);
                                const isSaved = savedJobIds.has(job.apply_url);

                                return (
                                    <div
                                        key={job.apply_url || i}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors group"
                                    >
                                        <CompanyLogo company={job.company} applyUrl={job.apply_url} size={36} colorIndex={i} />
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                href={`/dashboard/job/${encodeURIComponent(safeBtoa(job.apply_url || job.title))}`}
                                                onClick={() => {
                                                    try {
                                                        const key = `job_detail_${safeBtoa(job.apply_url || job.title)}`;
                                                        localStorage.setItem(key, JSON.stringify(job));
                                                    } catch (e) { /* ignore */ }
                                                }}
                                                className="text-[13px] font-medium text-gray-900 truncate hover:text-teal-600 transition-colors block"
                                            >
                                                {stripHtml(job.title)}
                                            </Link>
                                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                                {stripHtml(job.company)}
                                                {job.location && <> · {stripHtml(job.location)}</>}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <DotIndicator filled={dots} />
                                            <span className={`text-[11px] font-semibold ${score >= 70 ? 'text-teal-600' : score >= 50 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                {score}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => toggleSaveJob(job)}
                                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                                    isSaved
                                                        ? 'text-sky-500 bg-sky-50'
                                                        : 'text-gray-300 hover:text-sky-500 hover:bg-sky-50'
                                                }`}
                                                title={isSaved ? 'Saved' : 'Save'}
                                            >
                                                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-sky-500' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-5">
                {/* Recent Applications table */}
                <div className="glass-card rounded-xl border border-outline-variant/10 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/10">
                        <h3 className="text-[13px] font-semibold text-gray-900">Recent Applications</h3>
                        <Link href="/dashboard/applications" className="text-[12px] text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {recentApplied.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm text-gray-300">No applications yet</p>
                            <Link href="/dashboard/search" className="text-[12px] text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block">
                                Start searching
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {recentApplied.map((job, i) => {
                                const score = job.analysis?.fit_score || job.match_score || 0;
                                return (
                                    <Link
                                        key={job.apply_url || i}
                                        href={`/dashboard/job/${encodeURIComponent(safeBtoa(job.apply_url || job.title))}`}
                                        onClick={() => {
                                            try {
                                                const key = `job_detail_${safeBtoa(job.apply_url || job.title)}`;
                                                localStorage.setItem(key, JSON.stringify(job));
                                            } catch (e) { /* ignore */ }
                                        }}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors group"
                                    >
                                        <CompanyLogo company={job.company} applyUrl={job.apply_url} size={32} colorIndex={i} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-gray-900 truncate group-hover:text-teal-600 transition-colors">{stripHtml(job.title)}</p>
                                            <p className="text-[11px] text-gray-400 truncate">{stripHtml(job.company)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {score > 0 && (
                                                <span className={`text-[11px] font-semibold ${score >= 70 ? 'text-teal-600' : score >= 50 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                    {Math.round(score)}%
                                                </span>
                                            )}
                                            <span className="text-[11px] text-gray-300">{formatDate(job.applied_at)}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                    {/* Profile summary */}
                    {profile && (
                        <div className="glass-card rounded-xl border border-outline-variant/10 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
                                    {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-gray-900 truncate">{profile.name}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{jobTitle || 'Job Seeker'}</p>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-gray-400">Experience</span>
                                    <span className="font-medium text-gray-700">{experienceYears} years</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-gray-400">Skills</span>
                                    <span className="font-medium text-gray-700">{profile.skills?.length || 0} identified</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-gray-400">Location</span>
                                    <span className="font-medium text-gray-700">{preferences.location || 'Not set'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick navigation */}
                    <div className="glass-card rounded-xl border border-outline-variant/10 overflow-hidden">
                        <div className="px-5 py-3 border-b border-outline-variant/10">
                            <h3 className="text-[13px] font-semibold text-gray-900">Quick Actions</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            <Link href="/dashboard/search" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                    <Search className="w-3.5 h-3.5 text-teal-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">Search Jobs</p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                            </Link>
                            <Link href="/dashboard/saved" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                                    <Bookmark className="w-3.5 h-3.5 text-sky-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">Saved Jobs</p>
                                    {savedCount > 0 && <p className="text-[10px] text-gray-300">{savedCount} saved</p>}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                            </Link>
                            <Link href="/dashboard/applications" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
                                    <Briefcase className="w-3.5 h-3.5 text-accent-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">Applications</p>
                                    {appliedCount > 0 && <p className="text-[10px] text-gray-300">{appliedCount} tracked</p>}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
