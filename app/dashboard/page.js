'use client';
import { Search, Bookmark, Briefcase, TrendingUp, ArrowRight, Target, ChevronRight, Sparkles, Eye } from 'lucide-react';
import Link from 'next/link';
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
                        i < filled ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-700'
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
        toggleSaveJob, savedJobIds, toggleAppliedJob, appliedJobIds,
    } = useApp();

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
                    <h1 className="text-[22px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                        {user?.firstName ? `Hi, ${user.firstName}` : profile ? `Hi, ${profile.name?.split(' ')[0] || 'there'}` : 'Welcome to Midas Match'}
                    </h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        {profile
                            ? "Here's an overview of your job search activity."
                            : 'Upload your resume to get started.'}
                    </p>
                </div>
                <Link
                    href="/dashboard/search"
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors"
                >
                    <Search className="w-3.5 h-3.5" /> New Search
                </Link>
            </div>

            {/* Upload panel for new users */}
            {!profile && (
                <div className="bg-white dark:bg-[#1a1d27] rounded-xl border border-gray-200 dark:border-[#2d3140] p-6">
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
                        bg: 'bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-900/20 dark:to-emerald-900/20',
                        iconBg: 'bg-teal-100 dark:bg-teal-900/40',
                        iconColor: 'text-teal-600 dark:text-teal-400',
                        borderColor: 'border-teal-100 dark:border-teal-800/30',
                        sub: totalMatches > 0 ? 'From latest scan' : 'Run a scan',
                        trend: totalMatches > 0 ? `${totalMatches} found` : null,
                        trendUp: totalMatches > 0,
                    },
                    {
                        label: 'Saved',
                        value: savedCount,
                        icon: Bookmark,
                        color: 'sky',
                        bg: 'bg-gradient-to-br from-sky-50 to-blue-50/50 dark:from-sky-900/20 dark:to-blue-900/20',
                        iconBg: 'bg-sky-100 dark:bg-sky-900/40',
                        iconColor: 'text-sky-600 dark:text-sky-400',
                        borderColor: 'border-sky-100 dark:border-sky-800/30',
                        sub: savedCount > 0 ? 'Jobs bookmarked' : 'None yet',
                        trend: savedCount > 0 ? `${savedCount} saved` : null,
                        trendUp: savedCount > 0,
                    },
                    {
                        label: 'Applied',
                        value: appliedCount,
                        icon: Briefcase,
                        color: 'violet',
                        bg: 'bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-900/20 dark:to-purple-900/20',
                        iconBg: 'bg-violet-100 dark:bg-violet-900/40',
                        iconColor: 'text-violet-600 dark:text-violet-400',
                        borderColor: 'border-violet-100 dark:border-violet-800/30',
                        sub: appliedCount > 0 ? 'Applications sent' : 'None yet',
                        trend: appliedCount > 0 ? `${appliedCount} tracked` : null,
                        trendUp: appliedCount > 0,
                    },
                    {
                        label: 'Avg Score',
                        value: avgScore || '—',
                        icon: TrendingUp,
                        color: 'amber',
                        bg: 'bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/20',
                        iconBg: 'bg-amber-100 dark:bg-amber-900/40',
                        iconColor: 'text-amber-600 dark:text-amber-400',
                        borderColor: 'border-amber-100 dark:border-amber-800/30',
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
                                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{stat.label}</span>
                                <div className={`w-8 h-8 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                                    <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                                </div>
                            </div>
                            <div className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-none">{stat.value}</div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-[11px] text-gray-400 dark:text-gray-500">{stat.sub}</p>
                                {stat.trend && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                        stat.trendUp ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                    }`}>
                                        {stat.trendUp ? '↑' : '·'} {stat.trend}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ===== TOP PICKS — Best from latest scan ===== */}
            {profile && (
                <div className="bg-white dark:bg-[#1a1d27] rounded-xl border border-gray-200 dark:border-[#2d3140] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-[#2d3140]">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Top Picks</h3>
                                <p className="text-[10px] text-gray-400">Best matches from your latest scan</p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/search"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
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
                        <div className="divide-y divide-gray-50 dark:divide-[#2d3140]">
                            {topPicks.map((job, i) => {
                                const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
                                const dots = scoreToDots(score);
                                const isSaved = savedJobIds.has(job.apply_url);

                                return (
                                    <div
                                        key={job.apply_url || i}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 dark:hover:bg-[#22252f] transition-colors group"
                                    >
                                        <CompanyLogo company={job.company} applyUrl={job.apply_url} size={36} colorIndex={i} />
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                                onClick={() => {
                                                    try {
                                                        const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                                        localStorage.setItem(key, JSON.stringify(job));
                                                    } catch (e) { /* ignore */ }
                                                }}
                                                className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate hover:text-teal-600 transition-colors block"
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
                <div className="bg-white dark:bg-[#1a1d27] rounded-xl border border-gray-200 dark:border-[#2d3140] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-[#2d3140]">
                        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Recent Applications</h3>
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
                        <div className="divide-y divide-gray-50 dark:divide-[#2d3140]">
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
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 dark:hover:bg-[#22252f] transition-colors group"
                                    >
                                        <CompanyLogo company={job.company} applyUrl={job.apply_url} size={32} colorIndex={i} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-teal-600 transition-colors">{stripHtml(job.title)}</p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{stripHtml(job.company)}</p>
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
                        <div className="bg-white dark:bg-[#1a1d27] rounded-xl border border-gray-200 dark:border-[#2d3140] p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-white dark:text-gray-900 text-sm font-semibold">
                                    {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{profile.name}</p>
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{jobTitle || 'Job Seeker'}</p>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-gray-400 dark:text-gray-500">Experience</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{experienceYears} years</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-gray-400 dark:text-gray-500">Skills</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{profile.skills?.length || 0} identified</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-gray-400 dark:text-gray-500">Location</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{preferences.city || preferences.state || preferences.country || 'Not set'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick navigation */}
                    <div className="bg-white dark:bg-[#1a1d27] rounded-xl border border-gray-200 dark:border-[#2d3140] overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-[#2d3140]">
                            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-[#2d3140]">
                            <Link href="/dashboard/search" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 dark:hover:bg-[#22252f] transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                                    <Search className="w-3.5 h-3.5 text-teal-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">Search Jobs</p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                            </Link>
                            <Link href="/dashboard/saved" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 dark:hover:bg-[#22252f] transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                                    <Bookmark className="w-3.5 h-3.5 text-sky-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">Saved Jobs</p>
                                    {savedCount > 0 && <p className="text-[10px] text-gray-300 dark:text-gray-600">{savedCount} saved</p>}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                            </Link>
                            <Link href="/dashboard/applications" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 dark:hover:bg-[#22252f] transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                                    <Briefcase className="w-3.5 h-3.5 text-violet-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">Applications</p>
                                    {appliedCount > 0 && <p className="text-[10px] text-gray-300 dark:text-gray-600">{appliedCount} tracked</p>}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
