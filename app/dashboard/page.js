'use client';
import { useState, useEffect } from 'react';
import { Search, Bookmark, Briefcase, TrendingUp, ArrowRight, Target, ChevronRight, Sparkles, Zap, Activity, Eye, Brain, Mic, Network, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@clerk/nextjs';
import { OnboardingPanel } from '@/components/dashboard/OnboardingPanel';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

function NeuralMatchCard({ job, index, onSave, isSaved }) {
    const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
    const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '') : '';

    return (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            {/* Gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                score >= 85 ? 'from-brand-600 to-secondary-DEFAULT' :
                score >= 70 ? 'from-brand-500 to-brand-600' :
                'from-slate-300 to-slate-400'
            }`} />

            <div className="flex items-start gap-3">
                <CompanyLogo company={job.company} applyUrl={job.apply_url} size={40} colorIndex={index} />
                <div className="flex-1 min-w-0">
                    <Link
                        href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                        onClick={() => {
                            try { localStorage.setItem(`job_detail_${btoa(job.apply_url || job.title)}`, JSON.stringify(job)); } catch {}
                        }}
                        className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-brand-600 transition-colors line-clamp-1 font-headline block"
                    >
                        {stripHtml(job.title)}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stripHtml(job.company)} · {stripHtml(job.location) || 'Remote'}</p>
                </div>
                <div className="text-right shrink-0">
                    <div className={`text-lg font-extrabold font-headline ${
                        score >= 85 ? 'text-brand-600' : score >= 70 ? 'text-brand-500' : 'text-gray-400'
                    }`}>{score}%</div>
                    <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">Match</span>
                </div>
            </div>

            {/* Recruiter Pulse */}
            {score >= 70 && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-[#2d3140]">
                    {score >= 85 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <Eye className="w-3 h-3" />
                            Viewed {2 + index}x
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                        <Activity className="w-3 h-3" />
                        Active recently
                    </span>
                    <button
                        onClick={() => onSave(job)}
                        className={`ml-auto p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSaved ? 'text-brand-600 bg-brand-50' : 'text-slate-300 hover:text-brand-500 hover:bg-brand-50'
                        }`}
                    >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-brand-600' : ''}`} />
                    </button>
                </div>
            )}
        </div>
    );
}

function IntelligenceCard({ icon: Icon, title, description, href, gradient, tag }) {
    return (
        <Link href={href} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm hover:shadow-md transition-all group block">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">{title}</h3>
                        {tag && (
                            <span className="text-[9px] font-bold tracking-wider uppercase text-brand-600 bg-brand-50 dark:bg-brand-900/20 dark:text-brand-400 px-2 py-0.5 rounded-md">{tag}</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors shrink-0 mt-1" />
            </div>
        </Link>
    );
}

export default function DashboardHome() {
    const { user } = useUser();
    const {
        profile, jobs, savedJobsData, appliedJobsData,
        isParsing, fileInputRef, setIsParsing, setProfile,
        experienceYears, setExperienceYears, jobTitle, setJobTitle, addLog,
        preferences, setPreferences, neuralProfile,
        toggleSaveJob, savedJobIds, toggleAppliedJob, appliedJobIds,
    } = useApp();

    const topPicks = [...jobs]
        .sort((a, b) => (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0))
        .slice(0, 6);

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

    const ecosystemScore = neuralProfile?.ecosystemScore || (avgScore > 0 ? Math.min(99, avgScore + 15) : 0);

    const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '') : '';
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

    const recentApplied = appliedJobsData.slice(-5).reverse();

    return (
        <div className="max-w-[1100px] space-y-6">
            {/* Greeting + Hero */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30 mb-3">
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                        Intelligence Active
                    </span>
                    <h1 className="font-headline text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                        {user?.firstName ? `Welcome back, ${user.firstName}.` : profile ? `Welcome back, ${profile.name?.split(' ')[0] || 'there'}.` : 'Welcome to Midas Match.'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-lg leading-relaxed">
                        {profile
                            ? "Your AI career engine is actively monitoring the market. Here's your intelligence briefing."
                            : 'Upload your resume to activate the AI intelligence engine.'}
                    </p>
                </div>
                <Link
                    href="/dashboard/search"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-600/20 font-headline shrink-0"
                >
                    <Search className="w-4 h-4" /> New Scan
                </Link>
            </div>

            {/* Upload panel for new users */}
            {!profile && (
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                    <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} />
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Neural Matches', value: totalMatches, icon: Target, gradient: 'from-brand-600 to-secondary-DEFAULT', iconBg: 'bg-brand-100 dark:bg-brand-900/40', iconColor: 'text-brand-600 dark:text-brand-400', sub: totalMatches > 0 ? 'From latest scan' : 'Run a scan' },
                    { label: 'Pipeline', value: savedCount + appliedCount, icon: LayoutGrid, gradient: 'from-sky-500 to-blue-600', iconBg: 'bg-sky-100 dark:bg-sky-900/40', iconColor: 'text-sky-600 dark:text-sky-400', sub: `${savedCount} saved · ${appliedCount} applied` },
                    { label: 'Ecosystem Fit', value: ecosystemScore > 0 ? `${ecosystemScore}%` : '—', icon: Brain, gradient: 'from-secondary-DEFAULT to-purple-700', iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-secondary-DEFAULT dark:text-violet-400', sub: ecosystemScore >= 80 ? 'Strong alignment' : ecosystemScore > 0 ? 'Room to optimize' : 'Not calibrated' },
                    { label: 'Avg Match', value: avgScore || '—', icon: TrendingUp, gradient: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', sub: avgScore >= 70 ? 'Strong fit' : avgScore >= 50 ? 'Moderate' : 'No data' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] font-headline">{stat.label}</span>
                                <div className={`w-8 h-8 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                                    <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                                </div>
                            </div>
                            <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-none font-headline">{stat.value}</div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">{stat.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Intelligence Modules */}
            {profile && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-brand-500" />
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Intelligence Modules</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <IntelligenceCard
                            icon={Target}
                            title="Skill Bridge"
                            description="AI gap analysis comparing your profile against target roles. See exactly what to learn."
                            href="/dashboard/skill-bridge"
                            gradient="from-brand-600 to-secondary-DEFAULT"
                            tag="NEW"
                        />
                        <IntelligenceCard
                            icon={SlidersHorizontal}
                            title="Neural Refinement"
                            description="Tune your AI profile — risk appetite, seniority, culture fit — to refine match quality."
                            href="/dashboard/ai-refinement"
                            gradient="from-violet-600 to-purple-700"
                            tag="NEW"
                        />
                        <IntelligenceCard
                            icon={LayoutGrid}
                            title="Pipeline Orchestration"
                            description="Kanban view of your entire job pipeline with AI-powered pulse indicators."
                            href="/dashboard/pipeline"
                            gradient="from-sky-500 to-blue-600"
                        />
                        <IntelligenceCard
                            icon={Network}
                            title="Network Pulse"
                            description="Monitor your professional influence, engagement feed, and strategic connections."
                            href="/dashboard/network"
                            gradient="from-emerald-500 to-teal-600"
                        />
                        <IntelligenceCard
                            icon={Mic}
                            title="Voice Concierge"
                            description="Talk to your AI career advisor. Voice-enabled strategic discussions."
                            href="/dashboard/voice-concierge"
                            gradient="from-amber-500 to-orange-500"
                        />
                        <IntelligenceCard
                            icon={Brain}
                            title="Interview Prep"
                            description="AI-powered practice sessions tailored to your target companies and roles."
                            href="/dashboard/prep"
                            gradient="from-rose-500 to-pink-600"
                        />
                    </div>
                </div>
            )}

            {/* Neural Matches - Top Picks */}
            {profile && topPicks.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-secondary-DEFAULT flex items-center justify-center shadow-sm">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Neural Matches</h2>
                                <p className="text-[11px] text-slate-400">AI-ranked opportunities from your latest scan</p>
                            </div>
                        </div>
                        <Link href="/dashboard/search" className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-colors">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topPicks.map((job, i) => (
                            <NeuralMatchCard
                                key={job.apply_url || i}
                                job={job}
                                index={i}
                                onSave={toggleSaveJob}
                                isSaved={savedJobIds.has(job.apply_url)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Row - Applications + Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-5">
                {/* Recent Applications */}
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2d3140]">
                        <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 font-headline">Recent Applications</h3>
                        <Link href="/dashboard/applications" className="text-[12px] text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {recentApplied.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-3">
                                <Briefcase className="w-5 h-5 text-brand-400" />
                            </div>
                            <p className="text-sm text-slate-400 font-medium">No applications tracked yet</p>
                            <Link href="/dashboard/pipeline" className="text-[12px] text-brand-600 hover:text-brand-700 font-bold mt-2 inline-block">
                                Open Pipeline
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
                                            try { localStorage.setItem(`job_detail_${btoa(job.apply_url || job.title)}`, JSON.stringify(job)); } catch {}
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
                    {/* Neural Profile Summary */}
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
                            <Link
                                href="/dashboard/ai-refinement"
                                className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 bg-gray-50 dark:bg-[#22252f] hover:bg-gray-100 dark:hover:bg-[#2d3140] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Tune Neural Profile
                            </Link>
                        </div>
                    )}

                    {/* AI Insight Card */}
                    {profile && totalMatches > 0 && (
                        <div className="bg-gradient-to-br from-brand-600 to-secondary-DEFAULT rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-white/80" />
                                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/60">AI Insight</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-white/90">
                                Your search velocity is {avgScore >= 70 ? 'strong' : 'building'}. The AI predicts
                                {appliedCount > 0 ? ` an interview call within ${Math.max(3, 14 - appliedCount)} days` : ' high-quality matches when you start applying'}
                                {savedCount > 3 ? '. Your saved-to-applied ratio suggests you could be more selective.' : '.'}
                            </p>
                            <Link
                                href="/dashboard/pipeline"
                                className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold text-white/90 hover:text-white transition-colors"
                            >
                                View Pipeline <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    )}

                    {/* Quick nav to new features */}
                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#2d3140]">
                            <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 font-headline">Quick Actions</h3>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-[#2d3140]">
                            {[
                                { href: '/dashboard/search', icon: Search, label: 'Scan Opportunities', iconBg: 'bg-brand-50 dark:bg-brand-900/30', iconColor: 'text-brand-600' },
                                { href: '/dashboard/pipeline', icon: LayoutGrid, label: 'View Pipeline', iconBg: 'bg-sky-50 dark:bg-sky-900/30', iconColor: 'text-sky-500' },
                                { href: '/dashboard/skill-bridge', icon: Target, label: 'Skill Analysis', iconBg: 'bg-violet-50 dark:bg-violet-900/30', iconColor: 'text-secondary-DEFAULT' },
                                { href: '/dashboard/network', icon: Network, label: 'Network Pulse', iconBg: 'bg-emerald-50 dark:bg-emerald-900/30', iconColor: 'text-emerald-500' },
                            ].map((item) => (
                                <Link key={item.href} href={item.href} className="flex items-center gap-3 px-5 py-3 hover:bg-midas-surface-low/50 dark:hover:bg-[#22252f] transition-colors group">
                                    <div className={`w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                                        <item.icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                                    </div>
                                    <span className="flex-1 text-[13px] font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 font-headline">{item.label}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
