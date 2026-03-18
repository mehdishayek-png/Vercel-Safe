'use client';
import { Search, Bookmark, Briefcase, TrendingUp, ArrowRight, Target, Clock, ChevronRight, Sparkles, RefreshCw, Eye, Loader2, Zap, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@clerk/nextjs';
import { OnboardingPanel } from '@/components/dashboard/OnboardingPanel';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

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
    if (score >= 35) return 2;
    return 1;
}

export default function DashboardHome() {
    const { user } = useUser();
    const {
        profile, jobs, savedJobsData, appliedJobsData,
        isParsing, fileInputRef, setIsParsing, setProfile,
        experienceYears, setExperienceYears, jobTitle, setJobTitle, addLog,
        preferences, setPreferences,
        recommendations, isLoadingRecs, recsError, fetchRecommendations,
        toggleSaveJob, savedJobIds, toggleAppliedJob, appliedJobIds,
    } = useApp();

    // Auto-fetch recommendations when dashboard loads (if user has a profile)
    useEffect(() => {
        if (profile && profile.skills?.length > 0) {
            fetchRecommendations();
        }
    }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

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
                <div className="bg-white rounded-xl border border-gray-200 p-6">
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
                        bg: 'bg-gradient-to-br from-violet-50 to-purple-50/50',
                        iconBg: 'bg-violet-100',
                        iconColor: 'text-violet-600',
                        borderColor: 'border-violet-100',
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

            {/* ===== PICKED FOR YOU — Smart Recommendations ===== */}
            {profile && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-semibold text-gray-900">Picked for You</h3>
                                <p className="text-[10px] text-gray-400">Auto-curated based on your profile and activity</p>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchRecommendations(true)}
                            disabled={isLoadingRecs}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3 h-3 ${isLoadingRecs ? 'animate-spin' : ''}`} />
                            {isLoadingRecs ? 'Finding...' : 'Refresh'}
                        </button>
                    </div>

                    {isLoadingRecs && recommendations.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <Loader2 className="w-5 h-5 text-teal-500 animate-spin mx-auto mb-3" />
                            <p className="text-[13px] text-gray-400">Finding jobs that match your profile...</p>
                            <p className="text-[11px] text-gray-300 mt-1">Analyzing your skills, search history, and saved preferences</p>
                        </div>
                    ) : recsError && recommendations.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm text-gray-400">Couldn't load recommendations right now</p>
                            <button
                                onClick={() => fetchRecommendations(true)}
                                className="text-[12px] text-teal-600 hover:text-teal-700 font-medium mt-2 cursor-pointer"
                            >
                                Try again
                            </button>
                        </div>
                    ) : recommendations.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm text-gray-400">Run a job search first to help us learn your preferences</p>
                            <Link href="/dashboard/search" className="text-[12px] text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block">
                                Search Jobs
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {recommendations.map((job, i) => {
                                const score = job.match_score || 0;
                                const dots = scoreToDots(score);
                                const isSaved = savedJobIds.has(job.apply_url);
                                const isApplied = appliedJobIds.has(job.apply_url);

                                return (
                                    <div
                                        key={job.apply_url || i}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors group"
                                    >
                                        <CompanyLogo company={job.company} applyUrl={job.apply_url} size={36} colorIndex={i} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                                    onClick={() => {
                                                        try {
                                                            const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                                            localStorage.setItem(key, JSON.stringify(job));
                                                        } catch (e) { /* ignore */ }
                                                    }}
                                                    className="text-[13px] font-medium text-gray-900 truncate hover:text-teal-600 transition-colors"
                                                >
                                                    {stripHtml(job.title)}
                                                </Link>
                                                {job._boosted && (
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                                                        Preferred
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                                {stripHtml(job.company)}
                                                {job.location && <> · {stripHtml(job.location)}</>}
                                                {job.source && <> · <span className="text-gray-300">{job.source}</span></>}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <DotIndicator filled={dots} />
                                            {score > 0 && (
                                                <span className={`text-[11px] font-medium ${score >= 70 ? 'text-teal-600' : score >= 50 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                    {score}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Quick actions */}
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                            <Link
                                                href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                                onClick={() => {
                                                    try {
                                                        const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                                        localStorage.setItem(key, JSON.stringify(job));
                                                    } catch (e) { /* ignore */ }
                                                }}
                                                className="p-1.5 text-gray-300 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                                title="View details"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {recommendations.length > 0 && (
                        <div className="px-5 py-2.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] text-gray-300">
                                {recommendations.length} job{recommendations.length !== 1 ? 's' : ''} matched to your profile
                            </p>
                            <p className="text-[10px] text-gray-300">
                                Updates every 30 min · Click to view full details
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-5">
                {/* Recent Applications table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
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
                                        href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                        onClick={() => {
                                            try {
                                                const key = `job_detail_${btoa(job.apply_url || job.title)}`;
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
                                                    {score}%
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
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
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
                                    <span className="font-medium text-gray-700">{preferences.city || preferences.state || preferences.country || 'Not set'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick navigation */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100">
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
                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <Briefcase className="w-3.5 h-3.5 text-violet-500" />
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
