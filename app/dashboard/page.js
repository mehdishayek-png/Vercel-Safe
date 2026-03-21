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
                        i < filled ? 'bg-brand-500 dark:bg-brand-400' : 'bg-ink-200 dark:bg-ink-800'
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
                    <h1 className="font-display text-[22px] font-semibold text-ink-900 dark:text-ink-100 tracking-tight">
                        {user?.firstName ? `Hi, ${user.firstName}` : profile ? `Hi, ${profile.name?.split(' ')[0] || 'there'}` : 'Welcome to Midas Match'}
                    </h1>
                    <p className="text-sm text-ink-400 dark:text-ink-500 mt-1">
                        {profile
                            ? "Here's an overview of your job search activity."
                            : 'Upload your resume to get started.'}
                    </p>
                </div>
                <Link
                    href="/dashboard/search"
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-md text-[13px] font-medium transition-colors"
                >
                    <Search className="w-3.5 h-3.5" /> New Search
                </Link>
            </div>

            {/* Upload panel for new users */}
            {!profile && (
                <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-ink-800 p-6">
                    <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} />
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Matches', value: totalMatches, sub: totalMatches > 0 ? 'From latest scan' : 'Run a scan' },
                    { label: 'Saved', value: savedCount, sub: savedCount > 0 ? 'Jobs bookmarked' : 'None yet' },
                    { label: 'Applied', value: appliedCount, sub: appliedCount > 0 ? 'Applications sent' : 'None yet' },
                    { label: 'Avg Score', value: avgScore || '\u2014', sub: avgScore > 0 ? `${avgScore}/100 match` : 'No data' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-ink-800 p-4">
                        <span className="text-[11px] font-medium text-ink-400 dark:text-ink-500 uppercase tracking-wider">{stat.label}</span>
                        <div className="font-display text-[26px] font-bold text-ink-900 dark:text-ink-100 leading-none mt-2">{stat.value}</div>
                        <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1.5">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Top Picks */}
            {profile && (
                <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-ink-800 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100 dark:border-ink-800">
                        <div className="flex items-center gap-2">
                            <span className="gold-bar !w-3 !h-3 rounded-full" />
                            <div>
                                <h3 className="text-[13px] font-semibold text-ink-900 dark:text-ink-100">Top Picks</h3>
                                <p className="text-[10px] text-ink-400">Best matches from your latest scan</p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/search"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-ink-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-md transition-colors"
                        >
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {topPicks.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm text-ink-400">Run a job search to see your top matches here</p>
                            <Link href="/dashboard/search" className="text-[12px] text-brand-600 hover:text-brand-700 font-medium mt-2 inline-block">
                                Search Jobs
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-ink-100 dark:divide-ink-800">
                            {topPicks.map((job, i) => {
                                const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
                                const dots = scoreToDots(score);
                                const isSaved = savedJobIds.has(job.apply_url);

                                return (
                                    <div
                                        key={job.apply_url || i}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 dark:hover:bg-ink-900 transition-colors group"
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
                                                className="text-[13px] font-medium text-ink-900 dark:text-ink-100 truncate hover:text-brand-600 transition-colors block"
                                            >
                                                {stripHtml(job.title)}
                                            </Link>
                                            <p className="text-[11px] text-ink-400 truncate mt-0.5">
                                                {stripHtml(job.company)}
                                                {job.location && <> &middot; {stripHtml(job.location)}</>}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <DotIndicator filled={dots} />
                                            <span className={`text-[11px] font-semibold ${score >= 70 ? 'text-brand-600 dark:text-brand-400' : score >= 50 ? 'text-amber-500' : 'text-ink-400'}`}>
                                                {score}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => toggleSaveJob(job)}
                                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                                    isSaved
                                                        ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                                        : 'text-ink-300 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                                                }`}
                                                title={isSaved ? 'Saved' : 'Save'}
                                            >
                                                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-brand-500' : ''}`} />
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
                {/* Recent Applications */}
                <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-ink-800 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100 dark:border-ink-800">
                        <h3 className="text-[13px] font-semibold text-ink-900 dark:text-ink-100">Recent Applications</h3>
                        <Link href="/dashboard/applications" className="text-[12px] text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {recentApplied.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm text-ink-300 dark:text-ink-600">No applications yet</p>
                            <Link href="/dashboard/search" className="text-[12px] text-brand-600 hover:text-brand-700 font-medium mt-2 inline-block">
                                Start searching
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-ink-100 dark:divide-ink-800">
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
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 dark:hover:bg-ink-900 transition-colors group"
                                    >
                                        <CompanyLogo company={job.company} applyUrl={job.apply_url} size={32} colorIndex={i} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-ink-900 dark:text-ink-100 truncate group-hover:text-brand-600 transition-colors">{stripHtml(job.title)}</p>
                                            <p className="text-[11px] text-ink-400 dark:text-ink-500 truncate">{stripHtml(job.company)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {score > 0 && (
                                                <span className={`text-[11px] font-semibold ${score >= 70 ? 'text-brand-600 dark:text-brand-400' : score >= 50 ? 'text-amber-500' : 'text-ink-400'}`}>
                                                    {Math.round(score)}%
                                                </span>
                                            )}
                                            <span className="text-[11px] text-ink-300 dark:text-ink-600">{formatDate(job.applied_at)}</span>
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
                        <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-ink-800 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-ink-900 dark:bg-ink-100 flex items-center justify-center text-white dark:text-ink-900 text-sm font-semibold">
                                    {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-ink-900 dark:text-ink-100 truncate">{profile.name}</p>
                                    <p className="text-[11px] text-ink-400 dark:text-ink-500 truncate">{jobTitle || 'Job Seeker'}</p>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-ink-400 dark:text-ink-500">Experience</span>
                                    <span className="font-medium text-ink-700 dark:text-ink-300">{experienceYears} years</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-ink-400 dark:text-ink-500">Skills</span>
                                    <span className="font-medium text-ink-700 dark:text-ink-300">{profile.skills?.length || 0} identified</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                    <span className="text-ink-400 dark:text-ink-500">Location</span>
                                    <span className="font-medium text-ink-700 dark:text-ink-300">{preferences.city || preferences.state || preferences.country || 'Not set'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick navigation */}
                    <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-ink-800 overflow-hidden">
                        <div className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
                            <h3 className="text-[13px] font-semibold text-ink-900 dark:text-ink-100">Quick Actions</h3>
                        </div>
                        <div className="divide-y divide-ink-100 dark:divide-ink-800">
                            <Link href="/dashboard/search" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 dark:hover:bg-ink-900 transition-colors group">
                                <div className="w-8 h-8 rounded-md bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                    <Search className="w-3.5 h-3.5 text-brand-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-ink-700 dark:text-ink-300 group-hover:text-ink-900 dark:group-hover:text-ink-100">Search Jobs</p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-ink-300 dark:text-ink-600" />
                            </Link>
                            <Link href="/dashboard/saved" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 dark:hover:bg-ink-900 transition-colors group">
                                <div className="w-8 h-8 rounded-md bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                    <Bookmark className="w-3.5 h-3.5 text-brand-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-ink-700 dark:text-ink-300 group-hover:text-ink-900 dark:group-hover:text-ink-100">Saved Jobs</p>
                                    {savedCount > 0 && <p className="text-[10px] text-ink-300 dark:text-ink-600">{savedCount} saved</p>}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-ink-300 dark:text-ink-600" />
                            </Link>
                            <Link href="/dashboard/applications" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 dark:hover:bg-ink-900 transition-colors group">
                                <div className="w-8 h-8 rounded-md bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                    <Briefcase className="w-3.5 h-3.5 text-brand-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-ink-700 dark:text-ink-300 group-hover:text-ink-900 dark:group-hover:text-ink-100">Applications</p>
                                    {appliedCount > 0 && <p className="text-[10px] text-ink-300 dark:text-ink-600">{appliedCount} tracked</p>}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-ink-300 dark:text-ink-600" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
