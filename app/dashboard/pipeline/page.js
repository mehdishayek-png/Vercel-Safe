'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SlidersHorizontal, Plus, MoreHorizontal, Eye, CheckCircle, TrendingUp, Sparkles, MessageSquare, ArrowRight, Users } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { stripHtml } from '@/lib/strip-html';
import Link from 'next/link';

const PIPELINE_STAGES = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'];

const MOCK_PIPELINE = {
    SAVED: [
        {
            title: 'Senior Product Designer',
            company: 'Stripe',
            location: 'Remote',
            matchScore: 94,
            recruiterViews: 3,
            status: 'READY TO APPLY',
            statusType: 'ai',
        },
        {
            title: 'Staff Engineer',
            company: 'Linear',
            location: 'London',
            matchScore: 88,
            recruiterActive: '2h',
            status: 'RESUME GAP FOUND',
            statusType: 'gap',
        },
    ],
    APPLIED: [
        {
            title: 'Design Systems Lead',
            company: 'Airbnb',
            location: 'San Francisco',
            pipelinePulse: 68,
            pulseNote: '"Likelihood of response increasing based on internal referral patterns."',
            badge: 'IN REVIEW',
        },
    ],
    INTERVIEWING: [
        {
            title: 'Head of Experience',
            company: 'Revolut',
            location: 'London',
            pipelinePulse: 92,
            pulseNote: 'AI indicates high sentiment match from last tech debrief.',
            badge: 'ROUND 3',
            badgeTime: 'TODAY 2:00 PM',
        },
    ],
    OFFER: [
        {
            title: 'Principal Designer',
            company: 'OpenAI',
            location: 'SF / Remote',
            salary: '$240k - $310k',
            badge: null,
            showReview: true,
        },
    ],
};

const NEXT_MOVES = [
    {
        tag: 'INTERVIEW STRATEGY',
        title: 'Revolut Round 3 Prep',
        advice: '"Highlight your \'Cross-Functional Governance\' framework. Revolut\'s recent scaling memo emphasizes high-velocity decision-making."',
    },
    {
        tag: 'NEGOTIATION PIVOT',
        title: 'OpenAI Offer Terms',
        advice: '"The base is top-tier. AI suggests pivoting to \'Equity Acceleration\' rather than salary, given OpenAI\'s current valuation trajectory."',
    },
];

function PipelineCard({ job, stage }) {
    return (
        <div className="bg-white dark:bg-[#1a1d27] rounded-xl border border-slate-200/60 dark:border-[#2d3140] p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            {/* Top badges */}
            <div className="flex items-center justify-between mb-3">
                <CompanyLogo company={job.company} size={32} colorIndex={0} />
                <div className="flex items-center gap-2">
                    {job.matchScore && (
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 dark:text-brand-400 px-2 py-0.5 rounded-md">
                            MATCH {job.matchScore}%
                        </span>
                    )}
                    {job.recruiterViews && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            VIEWED {job.recruiterViews}x
                        </span>
                    )}
                    {job.recruiterActive && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ACTIVE IN LAST {job.recruiterActive}
                        </span>
                    )}
                    {job.badge && (
                        <span className="text-[10px] font-bold text-white bg-brand-600 px-2 py-0.5 rounded-md">
                            {job.badge}
                        </span>
                    )}
                    {job.badgeTime && (
                        <span className="text-[10px] font-medium text-gray-400">{job.badgeTime}</span>
                    )}
                </div>
            </div>

            {/* Job Info */}
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">{job.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{job.company} · {job.location}</p>

            {/* Pipeline Pulse */}
            {job.pipelinePulse && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-[#13151d] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-brand-600">Pipeline Pulse</span>
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">{job.pipelinePulse}%</span>
                    </div>
                    <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-5 flex-1 rounded-sm ${
                                    i < Math.ceil(job.pipelinePulse / 20)
                                        ? 'bg-brand-600 dark:bg-brand-500'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                            />
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 italic leading-relaxed">{job.pulseNote}</p>
                </div>
            )}

            {/* AI Status */}
            {job.statusType && (
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase">AI Analysis</span>
                    <span className={`text-[10px] font-bold ${
                        job.statusType === 'ai' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                        {job.status}
                    </span>
                </div>
            )}

            {/* Salary / Review */}
            {job.salary && (
                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase">Salary Estimate</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{job.salary}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
                    {job.showReview && (
                        <button className="w-full mt-2 px-4 py-2 border border-brand-200 dark:border-brand-700 text-brand-600 dark:text-brand-400 rounded-lg text-xs font-bold hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors cursor-pointer">
                            Review Terms
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function PulseBar({ value, segments = 5 }) {
    return (
        <div className="flex gap-1">
            {[...Array(segments)].map((_, i) => (
                <div key={i} className={`h-4 flex-1 rounded-sm ${i < Math.ceil(value / (100 / segments)) ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
            ))}
        </div>
    );
}

export default function PipelinePage() {
    const { savedJobsData, appliedJobsData, appliedJobIds } = useApp();
    const [showFilters, setShowFilters] = useState(false);

    // Build real pipeline from user data
    const realSaved = savedJobsData.filter(j => !appliedJobIds.has(j.apply_url));
    const realApplied = appliedJobsData || [];

    // Use real data if available, otherwise show mock data
    const hasPipelineData = realSaved.length > 0 || realApplied.length > 0;

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
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">AI-driven prioritization based on your communication flow and market alignment.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-brand-300 transition-colors cursor-pointer"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                    </button>
                    <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors cursor-pointer">
                        <Plus className="w-4 h-4" />
                        Add Job
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PIPELINE_STAGES.map((stage) => {
                    const stageJobs = MOCK_PIPELINE[stage] || [];
                    const stageColors = {
                        SAVED: 'text-gray-500',
                        APPLIED: 'text-brand-600',
                        INTERVIEWING: 'text-amber-600',
                        OFFER: 'text-emerald-600',
                    };
                    const dotColors = {
                        SAVED: 'bg-gray-400',
                        APPLIED: 'bg-brand-500',
                        INTERVIEWING: 'bg-amber-500',
                        OFFER: 'bg-emerald-500',
                    };
                    return (
                        <div key={stage}>
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <span className={`w-2 h-2 rounded-full ${dotColors[stage]}`} />
                                <span className={`text-[11px] font-bold tracking-[0.15em] uppercase ${stageColors[stage]}`}>
                                    {stage}
                                </span>
                                <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600 ml-1">{stageJobs.length}</span>
                                {stage === 'SAVED' && (
                                    <button className="ml-auto text-gray-300 hover:text-gray-500 cursor-pointer">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3 min-h-[200px]">
                                {stageJobs.map((job, i) => (
                                    <PipelineCard key={i} job={job} stage={stage} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pipeline Health Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 md:p-8 shadow-sm">
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 font-headline mb-2">Pipeline Health Intelligence</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Your job search velocity is <span className="font-bold text-brand-600">top 3%</span> for your skill quadrant. The AI predicts an accepted offer within <span className="font-bold text-brand-600">14 days</span> based on current pipeline momentum.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-5">
                            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-3">
                                <MessageSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Unread Signal</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Stripe's recruiter viewed your portfolio 4 times in the last 24h.</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-5">
                            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-3">
                                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Optimization Ready</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Update your 'Architecture' keywords to match Figma's new requirements.</p>
                        </div>
                    </div>
                </div>

                {/* Weekly Momentum */}
                <div className="bg-gradient-to-br from-brand-600 to-secondary-DEFAULT rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
                    <div>
                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/60">Weekly Momentum</span>
                        <p className="text-5xl font-extrabold mt-3 font-headline">+42%</p>
                        <p className="text-xs text-white/80 mt-2 leading-relaxed">Increase in recruiter inbound interest compared to last week.</p>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                        <div className="flex -space-x-2">
                            {['bg-sky-400', 'bg-emerald-400', 'bg-amber-400'].map((c, i) => (
                                <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-brand-600 flex items-center justify-center text-[9px] font-bold text-white`}>
                                    {['J', 'S', 'K'][i]}
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider ml-2">4 Connections at Target Companies</span>
                    </div>
                </div>
            </div>

            {/* AI Next Moves */}
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
        </div>
    );
}
