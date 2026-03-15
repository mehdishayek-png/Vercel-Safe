'use client';
import { Search, Bookmark, Briefcase, TrendingUp, ArrowRight, Upload, Target, Clock } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { OnboardingPanel } from '@/components/dashboard/OnboardingPanel';
import { ResumeStrength } from '@/components/ResumeStrength';

export default function DashboardHome() {
    const {
        profile, jobs, savedJobsData, appliedJobsData,
        isParsing, fileInputRef, setIsParsing, setProfile,
        experienceYears, setExperienceYears, jobTitle, setJobTitle, addLog,
        preferences, setPreferences,
    } = useApp();

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

    // Stats
    const totalMatches = jobs.length;
    const savedCount = savedJobsData.length;
    const appliedCount = appliedJobsData.length;
    const avgScore = totalMatches > 0
        ? Math.round(jobs.reduce((sum, j) => sum + (j.analysis?.fit_score || j.match_score || 0), 0) / totalMatches)
        : 0;

    const statCards = [
        { label: 'Total Matches', value: totalMatches, icon: Target, color: 'brand', change: totalMatches > 0 ? 'From last scan' : 'Run a scan' },
        { label: 'Saved Jobs', value: savedCount, icon: Bookmark, color: 'emerald', change: savedCount > 0 ? 'Click to view' : 'Save jobs you like' },
        { label: 'Applications', value: appliedCount, icon: Briefcase, color: 'accent', change: appliedCount > 0 ? 'Track progress' : 'Mark as applied' },
        { label: 'Avg. Score', value: avgScore || '—', icon: TrendingUp, color: 'amber', change: avgScore > 0 ? `${avgScore}/100` : 'No data yet' },
    ];

    const colorMap = {
        brand: { bg: 'bg-brand-50', icon: 'text-brand-600', border: 'border-brand-100' },
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
        accent: { bg: 'bg-accent-50', icon: 'text-accent-600', border: 'border-accent-100' },
        amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
    };

    // Recent applied jobs (top 5)
    const recentApplied = appliedJobsData.slice(-5).reverse();

    return (
        <div className="max-w-5xl space-y-6">
            {/* Greeting */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    {profile ? `Welcome back, ${profile.name?.split(' ')[0] || 'there'}` : 'Welcome to Midas Match'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {profile
                        ? 'Stay on top of your job hunt with quick access to key sections.'
                        : 'Upload your resume to get started with AI-powered job matching.'}
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(({ label, value, icon: Icon, color, change }) => {
                    const c = colorMap[color];
                    return (
                        <div key={label} className={`bg-white rounded-xl border ${c.border} p-5 hover:shadow-card transition-shadow`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
                                <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                                    <Icon className={`w-[18px] h-[18px] ${c.icon}`} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{value}</div>
                            <p className="text-[11px] text-gray-400 mt-1">{change}</p>
                        </div>
                    );
                })}
            </div>

            {/* Quick actions row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Upload / Profile card */}
                {!profile ? (
                    <div className="bg-white rounded-xl border border-surface-200 p-6 col-span-2">
                        <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} />
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-surface-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900">Your Profile</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-semibold">Active</span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Name</span>
                                <span className="font-medium text-gray-900">{profile.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Title</span>
                                <span className="font-medium text-gray-900 truncate ml-4">{jobTitle || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Experience</span>
                                <span className="font-medium text-gray-900">{experienceYears} years</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Skills</span>
                                <span className="font-medium text-gray-900">{profile.skills?.length || 0} extracted</span>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/search"
                            className="flex items-center justify-center gap-2 mt-4 w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                        >
                            <Search className="w-4 h-4" /> Search Jobs
                        </Link>
                    </div>
                )}

                {/* Quick links */}
                <div className="bg-white rounded-xl border border-surface-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                        <Link href="/dashboard/search" className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 transition-colors group">
                            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                                <Search className="w-4 h-4 text-brand-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">Search Jobs</p>
                                <p className="text-[11px] text-gray-400">Find new opportunities matched to your profile</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
                        </Link>
                        <Link href="/dashboard/saved" className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 transition-colors group">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                <Bookmark className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">Saved Jobs</p>
                                <p className="text-[11px] text-gray-400">{savedCount} saved job{savedCount !== 1 ? 's' : ''}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                        </Link>
                        <Link href="/dashboard/applications" className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 transition-colors group">
                            <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
                                <Briefcase className="w-4 h-4 text-accent-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">Applications</p>
                                <p className="text-[11px] text-gray-400">{appliedCount} application{appliedCount !== 1 ? 's' : ''} tracked</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-accent-500 transition-colors" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Recent Applications */}
            {recentApplied.length > 0 && (
                <div className="bg-white rounded-xl border border-surface-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900">Recent Applications</h3>
                        <Link href="/dashboard/applications" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {recentApplied.map((job, i) => (
                            <div key={job.apply_url || i} className="flex items-center gap-3 py-2 border-b border-surface-100 last:border-0">
                                <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                                    {(job.company || 'N/A').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{job.company} {job.location ? `· ${job.location}` : ''}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {job.applied_at ? new Date(job.applied_at).toLocaleDateString() : 'Recently'}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-semibold">Applied</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
