'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SlidersHorizontal, Plus, MoreHorizontal, Eye, TrendingUp, Sparkles, MessageSquare, ArrowRight, Activity } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { stripHtml } from '@/lib/strip-html';
import Link from 'next/link';

const PIPELINE_STAGES = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'];

const NEXT_MOVES = [
    {
        tag: 'INTERVIEW STRATEGY',
        title: 'Prepare for Top Applications',
        advice: '"Focus on behavioral questions and company-specific research for your strongest matches."',
    },
    {
        tag: 'OPTIMIZATION',
        title: 'Profile Enhancement',
        advice: '"Update your skills section to match keyword patterns in your top-scoring saved roles."',
    },
];

function PipelineCard({ job, stage }) {
    const score = Math.round(job.analysis?.fit_score || job.match_score || 0);
    const title = stripHtml(job.title || '');
    const company = stripHtml(job.company || '');
    const location = stripHtml(job.location || 'Remote');

    return (
        <Link
            href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
            onClick={() => {
                try { localStorage.setItem(`job_detail_${btoa(job.apply_url || job.title)}`, JSON.stringify(job)); } catch {}
            }}
            className="bg-white dark:bg-[#1a1d27] rounded-xl border border-slate-200/60 dark:border-[#2d3140] p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group block"
        >
            <div className="flex items-center justify-between mb-3">
                <CompanyLogo company={job.company} size={28} colorIndex={0} />
                <div className="flex items-center gap-2">
                    {score > 0 && (
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 dark:text-brand-400 px-2 py-0.5 rounded-md">
                            MATCH {score}%
                        </span>
                    )}
                    {score >= 85 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            HOT
                        </span>
                    )}
                    {stage === 'APPLIED' && (
                        <span className="text-[10px] font-bold text-white bg-brand-600 px-2 py-0.5 rounded-md">
                            IN REVIEW
                        </span>
                    )}
                </div>
            </div>

            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline line-clamp-1">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{company} · {location}</p>

            {/* Recruiter Pulse for high-scoring jobs */}
            {score >= 70 && (
                <div className="mt-3 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                        <Activity className="w-3 h-3" />
                        Active recently
                    </span>
                    {score >= 80 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <Eye className="w-3 h-3" />
                            Viewed
                        </span>
                    )}
                </div>
            )}

            {/* Applied date */}
            {job.applied_at && (
                <div className="mt-2 text-[10px] text-gray-400">
                    Applied {new Date(job.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
            )}
        </Link>
    );
}

export default function PipelinePage() {
    const { savedJobsData, appliedJobsData, appliedJobIds, jobs } = useApp();
    const [showFilters, setShowFilters] = useState(false);

    // Build real pipeline from user data
    const pipeline = useMemo(() => {
        const saved = savedJobsData.filter(j => !appliedJobIds.has(j.apply_url));
        const applied = appliedJobsData || [];

        return {
            SAVED: saved,
            APPLIED: applied,
            INTERVIEWING: [], // Future: track interview status
            OFFER: [], // Future: track offers
        };
    }, [savedJobsData, appliedJobsData, appliedJobIds]);

    const totalItems = Object.values(pipeline).reduce((sum, arr) => sum + arr.length, 0);
    const avgScore = totalItems > 0
        ? Math.round([...pipeline.SAVED, ...pipeline.APPLIED].reduce((sum, j) => sum + (j.analysis?.fit_score || j.match_score || 0), 0) / totalItems)
        : 0;

    return (
        <div className="max-w-[1200px] space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30 mb-3">
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                        Pipeline Intelligence Active
                    </span>
                    <h1 className="font-headline text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Orchestration View</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">AI-driven prioritization based on your activity and market alignment.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/search"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Find Jobs
                    </Link>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PIPELINE_STAGES.map((stage) => {
                    const stageJobs = pipeline[stage] || [];
                    const stageColors = { SAVED: 'text-gray-500', APPLIED: 'text-brand-600', INTERVIEWING: 'text-amber-600', OFFER: 'text-emerald-600' };
                    const dotColors = { SAVED: 'bg-gray-400', APPLIED: 'bg-brand-500', INTERVIEWING: 'bg-amber-500', OFFER: 'bg-emerald-500' };
                    return (
                        <div key={stage}>
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <span className={`w-2 h-2 rounded-full ${dotColors[stage]}`} />
                                <span className={`text-[11px] font-bold tracking-[0.15em] uppercase ${stageColors[stage]}`}>{stage}</span>
                                <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600 ml-1">{stageJobs.length}</span>
                            </div>
                            <div className="space-y-3 min-h-[200px]">
                                {stageJobs.length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-200 dark:border-[#2d3140] rounded-xl p-6 text-center">
                                        <p className="text-xs text-gray-400">
                                            {stage === 'SAVED' ? 'Save jobs from search' :
                                             stage === 'APPLIED' ? 'Mark jobs as applied' :
                                             stage === 'INTERVIEWING' ? 'Coming soon' : 'Coming soon'}
                                        </p>
                                    </div>
                                ) : (
                                    stageJobs.map((job, i) => (
                                        <PipelineCard key={job.apply_url || i} job={job} stage={stage} />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pipeline Health */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 md:p-8 shadow-sm">
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 font-headline mb-2">Pipeline Health Intelligence</h2>
                    {totalItems > 0 ? (
                        <>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Your pipeline has <span className="font-bold text-brand-600">{pipeline.SAVED.length} saved</span> and <span className="font-bold text-brand-600">{pipeline.APPLIED.length} applied</span> roles.
                                {avgScore >= 70 ? ' Your average match score is strong — focus on converting saves to applications.' :
                                 avgScore > 0 ? ' Consider refining your profile to improve match quality.' :
                                 ' Run a search to populate your pipeline.'}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-5">
                                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-3">
                                        <MessageSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Conversion Rate</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {pipeline.SAVED.length > 0 ?
                                            `${Math.round((pipeline.APPLIED.length / (pipeline.SAVED.length + pipeline.APPLIED.length)) * 100)}% of your pipeline has been applied to.` :
                                            'Start saving jobs to track your conversion.'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-5">
                                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-3">
                                        <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Average Match</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {avgScore > 0 ? `${avgScore}% average fit score across your pipeline.` : 'Scores will appear after AI analysis.'}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-400">Your pipeline is empty. Search for jobs and save your favorites to build your pipeline.</p>
                            <Link href="/dashboard/search" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors">
                                Start Searching
                            </Link>
                        </div>
                    )}
                </div>

                {/* Weekly Momentum */}
                <div className="bg-gradient-to-br from-brand-600 to-secondary-DEFAULT rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
                    <div>
                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/60">Pipeline Summary</span>
                        <p className="text-5xl font-extrabold mt-3 font-headline">{totalItems}</p>
                        <p className="text-xs text-white/80 mt-2">Total opportunities in your pipeline across all stages.</p>
                    </div>
                    <div className="mt-6">
                        <div className="flex gap-3 text-[10px] font-bold text-white/80">
                            <span>{pipeline.SAVED.length} Saved</span>
                            <span>·</span>
                            <span>{pipeline.APPLIED.length} Applied</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Next Moves */}
            {totalItems > 0 && (
                <div className="bg-gray-900 dark:bg-[#13151d] rounded-2xl p-6 md:p-8 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-brand-400" />
                        </div>
                        <h2 className="text-lg font-extrabold text-white font-headline">AI Next Moves</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {NEXT_MOVES.map((move, i) => (
                            <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10">
                                <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-brand-400">{move.tag}</span>
                                <h3 className="text-sm font-bold text-white mt-2">{move.title}</h3>
                                <p className="text-xs text-gray-400 mt-2 leading-relaxed italic">{move.advice}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
