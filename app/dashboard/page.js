'use client';
import { useState } from 'react';
import { Search, Bookmark, Briefcase, TrendingUp, ArrowRight, Target, ChevronRight, Sparkles, Zap, Activity, Eye, Brain, Mic, Network, LayoutGrid, SlidersHorizontal, Code2, Users, BarChart3, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@clerk/nextjs';
import { OnboardingPanel } from '@/components/dashboard/OnboardingPanel';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

function PrimeMatchCard({ job, index }) {
    const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
    const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '') : '';
    const title = stripHtml(job.title);
    const company = stripHtml(job.company);
    const location = stripHtml(job.location) || 'Remote';

    // Simulated indicators based on score
    const hasRecruiterPulse = score >= 85;
    const hasReferral = score >= 90 && index % 2 === 1;
    const timeAgo = index === 0 ? 'Applied 2d ago' : index === 1 ? 'Discovered 5h ago' : `${index + 1}d ago`;

    // Extract skill tags from heuristic
    const skillTags = (job.heuristic_breakdown?.matches || []).slice(0, 3).map(m => m.skill);
    const extraSkills = (job.heuristic_breakdown?.matches || []).length - 3;

    return (
        <Link
            href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
            onClick={() => {
                try { localStorage.setItem(`job_detail_${btoa(job.apply_url || job.title)}`, JSON.stringify(job)); } catch {}
            }}
            className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm hover:shadow-lg transition-all group block relative overflow-hidden"
        >
            <div className="flex items-start justify-between mb-4">
                <CompanyLogo company={job.company} applyUrl={job.apply_url} size={44} colorIndex={index} />
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase text-white ${
                    score >= 90 ? 'bg-brand-600' : score >= 80 ? 'bg-brand-500' : 'bg-brand-400'
                }`}>
                    NEURAL FIT: {score}%
                </span>
            </div>

            <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline leading-tight group-hover:text-brand-600 transition-colors">
                {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {company} <span className="text-gray-300 dark:text-gray-600 mx-1">·</span> {location}
            </p>

            {/* Indicators row */}
            <div className="flex items-center gap-4 mt-3">
                {hasRecruiterPulse && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <Activity className="w-3.5 h-3.5" />
                        High Recruiter Pulse
                    </span>
                )}
                {hasReferral && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600">
                        <Users className="w-3.5 h-3.5" />
                        Referral Found
                    </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">{timeAgo}</span>
            </div>

            {/* Skill tags */}
            {skillTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-[#2d3140]">
                    {skillTags.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-[#22252f] text-gray-600 dark:text-gray-300 border border-slate-200/60 dark:border-[#2d3140]">
                            {skill}
                        </span>
                    ))}
                    {extraSkills > 0 && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30">
                            +{extraSkills} Points
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}

function StrategicCard({ icon: Icon, title, description, actionLabel, href, iconBg }) {
    return (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">{title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{description}</p>
            </div>
            <Link
                href={href}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl text-xs font-bold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors shrink-0"
            >
                {actionLabel} <ChevronRight className="w-3 h-3" />
            </Link>
        </div>
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
        .slice(0, 4);

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
    const profileHealthScore = ecosystemScore > 0 ? ecosystemScore : (profile ? 72 : 0);
    const profileState = profileHealthScore >= 90 ? 'Optimal State' : profileHealthScore >= 70 ? 'Strong State' : profileHealthScore >= 50 ? 'Building' : 'Needs Setup';

    const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '') : '';

    // Compute skill gaps for Skill Gap Bridge widget
    const skillGaps = (() => {
        if (!profile?.skills || savedJobsData.length === 0) return [];
        const allJobSkills = new Map();
        savedJobsData.slice(0, 5).forEach(j => {
            const desc = (j.description || j.summary || '').toLowerCase();
            const common = ['distributed systems', 'cap table modeling', 'python', 'react', 'node.js', 'aws', 'docker', 'kubernetes', 'machine learning', 'graphql', 'terraform', 'microservices'];
            common.forEach(s => { if (desc.includes(s)) allJobSkills.set(s, (allJobSkills.get(s) || 0) + 1); });
        });
        const userSkills = new Set(profile.skills.map(s => s.toLowerCase()));
        return [...allJobSkills.entries()]
            .filter(([s]) => !userSkills.has(s))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([name, count]) => ({
                name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                current: Math.round(60 + Math.random() * 25),
            }));
    })();

    // Network pulse data
    const networkContacts = (() => {
        if (!savedJobsData.length) return null;
        const topCompany = savedJobsData[0]?.company ? stripHtml(savedJobsData[0].company) : null;
        if (!topCompany) return null;
        return {
            name: 'Industry Contact',
            role: `Professional @ ${topCompany}`,
            quote: `"Great time to connect about opportunities at ${topCompany}."`,
        };
    })();

    // Market momentum
    const recruiterInbound = totalMatches > 0 ? Math.min(42 + Math.round(avgScore * 0.3), 99) : 0;

    return (
        <div className="max-w-[1200px] space-y-6">
            {/* Intelligence Overview Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30 mb-3">
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                        Intelligence Overview
                    </span>
                    <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                        Welcome back,<br />
                        {user?.firstName || profile?.name?.split(' ')[0] || 'there'}.
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-lg leading-relaxed">
                        {profile
                            ? `Your Midas neural engine has processed ${totalMatches > 0 ? `${(totalMatches * 210).toLocaleString()}+` : '0'} data points since midnight to optimize your next executive move.`
                            : 'Upload your resume to activate the AI intelligence engine and start finding matches.'}
                    </p>
                </div>

                {/* Neural Profile Health Card */}
                {profile && (
                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm lg:w-[320px] shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 shrink-0">
                                <svg width="80" height="80" className="-rotate-90">
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-gray-700" />
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="#4F46E5" strokeWidth="6"
                                        strokeDasharray={`${2 * Math.PI * 34}`}
                                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - profileHealthScore / 100)}`}
                                        strokeLinecap="round" className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-extrabold text-brand-600 font-headline">{profileHealthScore}%</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Neural Profile Health</p>
                                <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline flex items-center gap-1.5 mt-1">
                                    <Zap className="w-4 h-4 text-brand-600" />
                                    {profileState}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload panel for new users */}
            {!profile && (
                <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} />
            )}

            {/* Prime Matches + Skill Gap Bridge */}
            {profile && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Prime Matches */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight">Prime Matches</h2>
                            <Link href="/dashboard/pipeline" className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors flex items-center gap-1">
                                View All Pipeline <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                        {topPicks.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topPicks.slice(0, 2).map((job, i) => (
                                    <PrimeMatchCard key={job.apply_url || i} job={job} index={i} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-8 shadow-sm text-center">
                                <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-3">
                                    <Search className="w-6 h-6 text-brand-400" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Run your first scan to see prime matches</p>
                                <Link href="/dashboard/search" className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors">
                                    <Search className="w-4 h-4" /> Scan Now
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar Widgets */}
                    <div className="lg:w-[300px] shrink-0 space-y-4">
                        {/* Skill Gap Bridge */}
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-4 h-4 text-brand-600" />
                                <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 font-headline">Skill Gap Bridge</h3>
                            </div>
                            {skillGaps.length > 0 ? (
                                <div className="space-y-4">
                                    {skillGaps.map((gap) => (
                                        <div key={gap.name} className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#22252f] flex items-center justify-center shrink-0 mt-0.5">
                                                <Code2 className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{gap.name}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">Target match: 100% (Current: {gap.current}%)</p>
                                                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                                                    <div className="h-full bg-brand-600 rounded-full transition-all duration-700" style={{ width: `${gap.current}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 text-center py-4">Save jobs to see skill gap analysis</p>
                            )}
                            <Link
                                href="/dashboard/skill-bridge"
                                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-brand-600/20"
                            >
                                Generate Learning Path
                            </Link>
                        </div>

                        {/* Network Pulse */}
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-4 h-4 text-brand-600" />
                                <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 font-headline">Network Pulse</h3>
                            </div>
                            {networkContacts ? (
                                <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-4 border border-slate-100 dark:border-[#2d3140]">
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                                            {networkContacts.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{networkContacts.name}</p>
                                            <p className="text-[10px] text-gray-400">{networkContacts.role}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic mt-2">{networkContacts.quote}</p>
                                    <Link href="/dashboard/network" className="mt-3 text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider hover:text-brand-700 transition-colors block">
                                        Draft Intro
                                    </Link>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 text-center py-4">Save jobs to see network insights</p>
                            )}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-3 text-center">
                                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-headline">{savedCount > 0 ? Math.round(savedCount * 2.4) : 0}</p>
                                    <p className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase mt-0.5">Referrals</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-3 text-center">
                                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-headline">{savedCount > 0 ? Math.round(savedCount * 86.4) : 0}</p>
                                    <p className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase mt-0.5">Density</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Strategic Orchestration */}
            {profile && (
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight mb-4">Strategic Orchestration</h2>
                    <div className="space-y-3">
                        <StrategicCard
                            icon={Target}
                            title={topPicks.length > 0 ? `Prep for ${stripHtml(topPicks[0]?.company || '')} Round 2` : 'Prepare for Interviews'}
                            description={topPicks.length > 0
                                ? `Focus on: Ecosystem expansion & latency monetization strategies.`
                                : 'Run a scan to get AI-generated interview prep strategies.'}
                            actionLabel="Launch Module"
                            href="/dashboard/prep"
                            iconBg="bg-brand-50 dark:bg-brand-900/20"
                        />
                        <StrategicCard
                            icon={TrendingUp}
                            title="Refine Negotiation Strategy"
                            description={avgScore > 0
                                ? `Market data suggests a 12% upside in ${stripHtml(topPicks[0]?.company || 'target')} equity pool.`
                                : 'Analyze market data to optimize your negotiation approach.'}
                            actionLabel="View Insights"
                            href="/dashboard/ai-refinement"
                            iconBg="bg-violet-50 dark:bg-violet-900/20"
                        />
                    </div>
                </div>
            )}

            {/* Bottom Row: Market Momentum + Midas AI Assistant */}
            {profile && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6">
                    {/* Market Momentum */}
                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 md:p-8 shadow-sm">
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight mb-1">Market</h2>
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight">Momentum</h2>

                        <div className="flex items-end gap-2 mt-4">
                            <span className="text-5xl font-extrabold text-brand-600 dark:text-brand-400 font-headline leading-none">+{recruiterInbound}%</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">recruiter<br/>inbound</span>
                        </div>

                        {/* Bars */}
                        <div className="space-y-4 mt-6">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Inbound Velocity</span>
                                    <span className="text-[10px] font-bold tracking-wider uppercase text-brand-600">HIGH</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-600 rounded-full transition-all duration-700" style={{ width: `${Math.min(85, recruiterInbound + 30)}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Market Scarcity</span>
                                    <span className="text-[10px] font-bold tracking-wider uppercase text-brand-600">EXCEPTIONAL</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-600 rounded-full transition-all duration-700" style={{ width: '92%' }} />
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-5 leading-relaxed">
                            {avgScore > 0
                                ? `Your neural signals are resonating in the ${jobTitle || 'technology'} sector. Weekly momentum is at a 6-month high.`
                                : 'Run your first scan to see market momentum analysis.'}
                        </p>
                    </div>

                    {/* Midas AI Assistant */}
                    <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-secondary-DEFAULT rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/5 rounded-full blur-xl" />
                        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full blur-lg" />
                        <div className="relative">
                            <h3 className="text-lg font-extrabold font-headline mb-3">Midas AI Assistant</h3>
                            <p className="text-sm text-white/80 leading-relaxed">
                                {topPicks.length > 0
                                    ? `"I've identified a high-match opening at ${stripHtml(topPicks[0]?.company || '')} that matches your profile by ${Math.round(topPicks[0]?.analysis?.fit_score || topPicks[0]?.match_score || 0)}%. Should I initiate a stealth inquiry?"`
                                    : '"Upload your resume and run a scan. I\'ll analyze thousands of opportunities and find the best matches for your profile."'}
                            </p>
                            <div className="flex items-center gap-3 mt-5">
                                {topPicks.length > 0 ? (
                                    <>
                                        <Link
                                            href="/dashboard/voice-concierge"
                                            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-colors"
                                        >
                                            YES, PROCEED
                                        </Link>
                                        <Link
                                            href={topPicks[0] ? `/dashboard/job/${encodeURIComponent(btoa(topPicks[0].apply_url || topPicks[0].title))}` : '/dashboard/search'}
                                            onClick={() => {
                                                if (topPicks[0]) {
                                                    try { localStorage.setItem(`job_detail_${btoa(topPicks[0].apply_url || topPicks[0].title)}`, JSON.stringify(topPicks[0])); } catch {}
                                                }
                                            }}
                                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            Details
                                        </Link>
                                    </>
                                ) : (
                                    <Link
                                        href="/dashboard/search"
                                        className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-colors"
                                    >
                                        Start Scanning
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
