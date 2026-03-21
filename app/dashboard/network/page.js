'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TrendingUp, ArrowUpRight, Share2, MessageSquare, RefreshCw, Sparkles, BookOpen, Send, Loader2 } from 'lucide-react';

function StatCard({ label, value, change }) {
    return (
        <div className="text-center">
            <span className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase">{label}</span>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-headline mt-1">{value}</p>
            {change && (
                <span className="text-[10px] font-semibold text-emerald-500">
                    <ArrowUpRight className="w-3 h-3 inline" /> {change}
                </span>
            )}
        </div>
    );
}

function NetworkDensityMap({ clusters }) {
    return (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Network Density Map</h2>
            </div>
            <div className="relative h-[220px] flex items-center justify-center">
                <div className="flex flex-wrap gap-4 items-center justify-center">
                    {clusters.map((cluster, i) => {
                        const sizes = { sm: 'w-16 h-16 text-xs', md: 'w-20 h-20 text-sm', lg: 'w-28 h-28 text-base' };
                        return (
                            <div
                                key={cluster.company}
                                className={`${sizes[cluster.size]} rounded-full bg-gray-100 dark:bg-[#22252f] border-2 ${
                                    cluster.size === 'lg' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-600'
                                } flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                            >
                                <span className="font-bold text-gray-700 dark:text-gray-300">{cluster.letter}</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 text-center px-1 leading-tight">
                                    {cluster.company} ({cluster.connections})
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function NetworkPulsePage() {
    const { profile, savedJobsData, appliedJobsData } = useApp();
    const [activeTab, setActiveTab] = useState('strategic');
    const [networkData, setNetworkData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchNetworkPulse = useCallback(async () => {
        if (!profile) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/network-pulse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile,
                    savedJobs: savedJobsData,
                    appliedJobs: appliedJobsData,
                }),
            });
            if (!res.ok) throw new Error('Failed to fetch network data');
            const data = await res.json();
            setNetworkData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [profile, savedJobsData, appliedJobsData]);

    useEffect(() => {
        if (profile) fetchNetworkPulse();
    }, [profile, fetchNetworkPulse]);

    const score = networkData?.thoughtLeadershipScore || 0;
    const percentile = networkData?.percentile || '';
    const clusters = networkData?.networkClusters || [];
    const stats = networkData?.stats || {};
    const strategies = networkData?.strategies || [];

    // Engagement feed from real saved/applied data
    const engagementItems = [
        ...(savedJobsData.slice(-3).reverse().map(job => ({
            name: job.company || 'Company',
            role: `Saved · ${job.title || 'Role'}`,
            time: 'Recently',
            content: `You saved this ${(job.match_score || 0) >= 80 ? 'high-match' : ''} opportunity. ${
                (job.match_score || 0) >= 80 ? 'This is a strong candidate for your pipeline.' : 'Consider analyzing the skill gap for this role.'
            }`,
            avatar: (job.company || 'C').charAt(0),
            avatarColor: 'bg-brand-500',
            actions: [{ label: 'View Details', primary: true }],
        }))),
        ...(appliedJobsData.slice(-2).reverse().map(job => ({
            name: job.company || 'Company',
            role: `Applied · ${job.title || 'Role'}`,
            time: job.applied_at ? new Date(job.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently',
            content: `Application submitted. Monitor recruiter activity and prepare for potential outreach.`,
            avatar: (job.company || 'C').charAt(0),
            avatarColor: 'bg-emerald-500',
            actions: [{ label: 'Prep Interview', primary: true }],
        }))),
    ];

    if (!profile) {
        return (
            <div className="max-w-[1100px]">
                <h1 className="font-headline text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-6">
                    <span className="text-brand-600 dark:text-brand-400">Network Pulse</span>
                </h1>
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-12 shadow-sm text-center">
                    <p className="text-sm text-gray-500">Upload your resume on the search page to activate Network Pulse.</p>
                </div>
            </div>
        );
    }

    if (isLoading && !networkData) {
        return (
            <div className="max-w-[1100px]">
                <h1 className="font-headline text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-6">
                    <span className="text-brand-600 dark:text-brand-400">Network Pulse</span>
                </h1>
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-16 shadow-sm text-center">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Analyzing your network...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1100px] space-y-6">
            <h1 className="font-headline text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                <span className="text-brand-600 dark:text-brand-400">Network Pulse</span>
            </h1>

            {/* Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Thought Leadership */}
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30 mb-4">
                        AI Score
                    </span>
                    <div className="flex items-end gap-1 mb-1">
                        <span className="text-6xl font-extrabold text-brand-600 dark:text-brand-400 font-headline leading-none">{score}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">{percentile}</span>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline mt-3">Thought Leadership</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                        Your professional influence score based on your skills, experience, and job search activity.
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-[#2d3140]">
                        <StatCard label="Views" value={stats.views ? `${(stats.views / 1000).toFixed(1)}k` : '—'} change={stats.views ? '14%' : null} />
                        <StatCard label="Reach" value={stats.reach ? `${(stats.reach / 1000).toFixed(1)}k` : '—'} change={stats.reach ? '8%' : null} />
                        <StatCard label="Engage" value={stats.engagementRate ? `${stats.engagementRate}%` : '—'} change={stats.engagementRate ? '22%' : null} />
                    </div>
                </div>

                {/* Network Density */}
                <NetworkDensityMap clusters={clusters} />
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
                {/* Strategies */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Presence & Voice</h2>
                        <Sparkles className="w-5 h-5 text-brand-400" />
                    </div>
                    {strategies.length > 0 ? strategies.map((strategy, i) => (
                        <div key={i} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                            <span className={`text-[9px] font-bold tracking-[0.15em] uppercase ${
                                strategy.tag === 'HIGH IMPACT' ? 'text-red-500' : 'text-brand-600'
                            }`}>
                                {strategy.tag}
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2 leading-snug">{strategy.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{strategy.description}</p>
                            <button className="flex items-center gap-1 mt-3 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors cursor-pointer">
                                {strategy.action} <ArrowUpRight className="w-3 h-3" />
                            </button>
                        </div>
                    )) : (
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm text-center">
                            <p className="text-xs text-gray-400">Add more skills to your profile for personalized strategies.</p>
                        </div>
                    )}
                    <button className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-[#22252f] hover:bg-gray-200 dark:hover:bg-[#2d3140] text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-colors cursor-pointer">
                        <BookOpen className="w-4 h-4" />
                        Draft Thought Leadership Post
                    </button>
                </div>

                {/* Engagement Feed */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Active Engagement Feed</h2>
                    </div>
                    <div className="space-y-4">
                        {engagementItems.length > 0 ? engagementItems.map((item, i) => (
                            <div key={i} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                                <div className="flex gap-3">
                                    <div className={`w-10 h-10 rounded-full ${item.avatarColor} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                                        {item.avatar}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.name}</span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{item.role}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-medium">{item.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">{item.content}</p>
                                        <div className="flex items-center gap-3 mt-3">
                                            {item.actions.map((action, j) => (
                                                <button key={j} className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 cursor-pointer">
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-8 shadow-sm text-center">
                                <p className="text-sm text-gray-400">Save and apply to jobs to populate your engagement feed.</p>
                            </div>
                        )}

                        <div className="flex items-center justify-end">
                            <button
                                onClick={fetchNetworkPulse}
                                disabled={isLoading}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:border-brand-300 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-brand-600/20 font-headline cursor-pointer">
                    <Sparkles className="w-4 h-4" /> New Strategy
                </button>
            </div>
        </div>
    );
}
