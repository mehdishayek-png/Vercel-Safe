'use client';
import { Search, Bookmark, Briefcase, TrendingUp, ArrowRight, Target, ChevronRight, Sparkles, Zap } from 'lucide-react';
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
                        i < filled ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
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
                    <h1 className="font-headline text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                        {user?.firstName ? `Hi, ${user.firstName}` : profile ? `Hi, ${profile.name?.split(' ')[0] || 'there'}` : 'Welcome to Midas Match'}
                    </h1>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        {profile
                            ? "Here's an overview of your job search activity."
                            : 'Upload your resume to get started.'}
                    </p>
                </div>
                <Link
                    href="/dashboard/search"
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-[13px] font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-600/20 font-headline"
                >
                    <Search className="w-3.5 h-3.5" /> New Search
                </Link>
            </div>

            {/* Upload panel for new users */}
            {!profile && (
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                    <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} />
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Matches',
                        value: totalMatches,
                        icon: Target,
                        gradient: 'from-brand-600 to-secondary-DEFAULT',
                        iconBg: 'bg-brand-100 dark:bg-brand-900/40',
                        iconColor: 'text-brand-600 dark:text-brand-400',
                        sub: totalMatches > 0 ? 'From latest scan' : 'Run a scan',
                        trend: totalMatches > 0 ? `${totalMatches} found` : null,
                        trendUp: totalMatches > 0,
                    },
                    {
                        label: 'Saved',
                        value: savedCount,
                        icon: Bookmark,
                        gradient: 'from-sky-500 to-blue-600',
                        iconBg: 'bg-sky-100 dark:bg-sky-900/40',
                        iconColor: 'text-sky-600 dark:text-sky-400',
                        sub: savedCount > 0 ? 'Jobs bookmarked' : 'None yet',
                        trend: savedCount > 0 ? `${savedCount} saved` : null,
                        trendUp: savedCount > 0,
                    },
                    {
                        label: 'Applied',
                        value: appliedCount,
                        icon: Briefcase,
                        gradient: 'from-secondary-DEFAULT to-purple-700',
                        iconBg: 'bg-violet-100 dark:bg-violet-900/40',
                        iconColor: 'text-secondary-DEFAULT dark:text-violet-400',
                        sub: appliedCount > 0 ? 'Applications sent' : 'None yet',
                        trend: appliedCount > 0 ? `${appliedCount} tracked` : null,
                        trendUp: appliedCount > 0,
                    },
                    {
                        label: 'Avg Score',
                        value: avgScore || '—',
                        icon: TrendingUp,
                        gradient: 'from-amber-500 to-orange-500',
                        iconBg: 'bg-amber-100 dark:bg-amber-900/40',
                        iconColor: 'text-amber-600 dark:text-amber-400',
                        sub: avgScore > 0 ? `${avgScore}/100 match` : 'No data',
                        trend: avgScore >= 70 ? 'Strong' : avgScore >= 50 ? 'Moderate' : null,
                        trendUp: avgScore >= 60,
                    },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Gradient accent */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] font-headline">{stat.label}</span>
                                <div className={`w-8 h-8 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                                    <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                                </div>
                            </div>
                            <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-none font-headline">{stat.value}</div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">{stat.sub}</p>
                                {stat.trend && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        stat.trendUp ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {stat.trendUp ? '↑' : '·'} {stat.trend}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Top Picks */}
            {profile && (
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2d3140]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-secondary-DEFAULT flex items-center justify-center shadow-sm">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 font-headline">Top Picks</h3>
                                <p className="text-[11px] text-slate-400">Best matches from your latest scan</p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/search"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-colors"
                        >
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {topPicks.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-3">
                                <Search className="w-5 h-5 text-brand-400" />
                            </div>
                            <p className="text-sm text-slate-400 font-medium">Run a job search to see your top matches here</p>
                            <Link href="/dashboard/search" className="text-[12px] text-brand-600 hover:text-brand-700 font-bold mt-2 inline-block">
                                Search Jobs
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-[#2d3140]">
                            {topPicks.map((job, i) => {
                                const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
                                const dots = scoreToDots(score);
                                const isSaved = savedJobIds.has(job.apply_url);

                                return (
                                    <div
                                        key={job.apply_url || i}
                                        className="flex items-center gap-3 px-6 py-3.5 hover:bg-midas-surface-low/50 dark:hover:bg-[#22252f] transition-colors group"
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
                                                className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-brand-600 transition-colors block font-headline"
                                            >
                                                {stripHtml(job.title)}
                                            </Link>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                {stripHtml(job.company)}
                                                {job.location && <> · {stripHtml(job.location)}</>}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <DotIndicator filled={dots} />
                                            <span className={`text-[12px] font-bold font-headline ${score >= 70 ? 'text-brand-600' : score >= 50 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                {score}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => toggleSaveJob(job)}
                                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                    isSaved
                                                        ? 'text-brand-600 bg-brand-50'
                                                        : 'text-slate-300 hover:text-brand-500 hover:bg-brand-50'
                                                }`}
                                                title={isSaved ? 'Saved' : 'Save'}
                                            >
                                                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-brand-600' : ''}`} />
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
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2d3140]">
                        <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 font-headline">Recent Applications</h3>
                        <Link href="/dashboard/applications" className="text-[12px] text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {recentApplied.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm text-slate-400">No applications yet</p>
                            <Link href="/dashboard/search" className="text-[12px] text-brand-600 hover:text-brand-700 font-bold mt-2 inline-block">
                                Start searching
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-[#2d3140]">
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
                                        className="flex items-center gap-3 px-6 py-3.5 hover:bg-midas-surface-low/50 dark:hover:bg-[#22252f] transition-colors group"
                                    >
                                        <CompanyLogo company={job.company} applyUrl={job.apply_url} size={32} colorIndex={i} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-brand-600 transition-colors font-headline">{stripHtml(job.title)}</p>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{stripHtml(job.company)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {score > 0 && (
                                                <span className={`text-[12px] font-bold font-headline ${score >= 70 ? 'text-brand-600' : score >= 50 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                    {Math.round(score)}%
                                                </span>
                                            )}
                                            <span className="text-[11px] text-slate-400">{formatDate(job.applied_at)}</span>
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
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-secondary-DEFAULT flex items-center justify-center text-white text-sm font-bold shadow-md shadow-brand-600/20">
                                    {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100 truncate font-headline">{profile.name}</p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{jobTitle || 'Job Seeker'}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-slate-400 dark:text-slate-500">Experience</span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300 font-headline">{experienceYears} years</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-slate-400 dark:text-slate-500">Skills</span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300 font-headline">{profile.skills?.length || 0} identified</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-slate-400 dark:text-slate-500">Location</span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300 font-headline">{preferences.city || preferences.state || preferences.country || 'Not set'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick navigation */}
                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#2d3140]">
                            <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 font-headline">Quick Actions</h3>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-[#2d3140]">
                            <Link href="/dashboard/search" className="flex items-center gap-3 px-5 py-3 hover:bg-midas-surface-low/50 dark:hover:bg-[#22252f] transition-colors group">
                                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                                    <Search className="w-3.5 h-3.5 text-brand-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 font-headline">Search Jobs</p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                            </Link>
                            <Link href="/dashboard/saved" className="flex items-center gap-3 px-5 py-3 hover:bg-midas-surface-low/50 dark:hover:bg-[#22252f] transition-colors group">
                                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                                    <Bookmark className="w-3.5 h-3.5 text-sky-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 font-headline">Saved Jobs</p>
                                    {savedCount > 0 && <p className="text-[10px] text-slate-400 dark:text-slate-500">{savedCount} saved</p>}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                            </Link>
                            <Link href="/dashboard/applications" className="flex items-center gap-3 px-5 py-3 hover:bg-midas-surface-low/50 dark:hover:bg-[#22252f] transition-colors group">
                                <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                                    <Briefcase className="w-3.5 h-3.5 text-secondary-DEFAULT" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 font-headline">Applications</p>
                                    {appliedCount > 0 && <p className="text-[10px] text-slate-400 dark:text-slate-500">{appliedCount} tracked</p>}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
