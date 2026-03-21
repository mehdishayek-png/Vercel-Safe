'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TrendingUp, Eye, ArrowUpRight, Share2, MessageSquare, RefreshCw, Sparkles, ChevronRight, ExternalLink, Send, BookOpen } from 'lucide-react';

const NETWORK_CLUSTERS = [
    { company: 'Apple', connections: 14, letter: 'A', size: 'md' },
    { company: 'Meta', connections: 9, letter: 'M', size: 'sm' },
    { company: 'OpenAI', connections: 42, letter: 'O', size: 'lg' },
    { company: 'Google', connections: 23, letter: 'G', size: 'md' },
];

const ENGAGEMENT_FEED = [
    {
        name: 'Sarah Jenkins',
        role: 'Eng Director @ OpenAI',
        time: '2H AGO',
        content: 'Shared a post about scaling infrastructure for multi-modal agents.',
        highlight: 'This is a high-priority strategic opportunity for you to connect.',
        actions: [
            { label: 'Relevant Comment Drafted', icon: MessageSquare, primary: true },
            { label: 'Share to DM', icon: Share2 },
        ],
        avatar: 'S',
        avatarColor: 'bg-sky-500',
    },
    {
        name: 'David Miller',
        role: 'Sr. Recruiter @ Apple',
        time: '5H AGO',
        content: 'Viewed your profile for the 3rd time this week. Your recent post on "Efficient Attention Mechanisms" triggered this interest.',
        actions: [
            { label: 'Send Warm Connection', icon: Send, primary: true },
            { label: 'Ignore', icon: null },
        ],
        avatar: 'D',
        avatarColor: 'bg-amber-500',
    },
    {
        name: 'Midas AI',
        role: 'System Update',
        time: '12H AGO',
        content: 'Successfully synced 124 new interactions and 3 new high-priority targets from your LinkedIn activity.',
        actions: [
            { label: 'Review Network Map', icon: null },
        ],
        avatar: '⚡',
        avatarColor: 'bg-brand-500',
        isSystem: true,
    },
];

const VOICE_STRATEGIES = [
    {
        tag: 'HIGH IMPACT',
        title: 'Comment on Apple\'s latest AI release to show expertise in ML.',
        description: 'Target recruiters at Apple and OpenAI are actively tracking this topic.',
        action: 'Draft Suggestion',
    },
    {
        tag: 'TREND MATCH',
        title: 'Share insights on the shift towards \'Small Language Models\'.',
        description: 'Aligns with your expertise and recent job descriptions for Staff AI roles.',
        action: 'Generate Draft',
    },
];

function StatCard({ label, value, change, changeDir = 'up' }) {
    return (
        <div className="text-center">
            <span className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase">{label}</span>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-headline mt-1">{value}</p>
            {change && (
                <span className={`text-[10px] font-semibold ${changeDir === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                    <ArrowUpRight className={`w-3 h-3 inline ${changeDir === 'down' ? 'rotate-90' : ''}`} />
                    {change}
                </span>
            )}
        </div>
    );
}

function NetworkDensityMap() {
    return (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Network Density Map</h2>
                <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-600" /> Target Pipeline</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" /> Outside Network</span>
                </div>
            </div>
            <div className="relative h-[220px] flex items-center justify-center">
                {/* Simulated network visualization */}
                <div className="relative w-full h-full">
                    {NETWORK_CLUSTERS.map((cluster, i) => {
                        const positions = [
                            { top: '15%', left: '20%' },
                            { top: '35%', left: '45%' },
                            { top: '20%', right: '15%' },
                            { bottom: '25%', left: '15%' },
                        ];
                        const sizes = { sm: 'w-16 h-16 text-xs', md: 'w-20 h-20 text-sm', lg: 'w-28 h-28 text-base' };
                        return (
                            <div
                                key={cluster.company}
                                className={`absolute ${sizes[cluster.size]} rounded-full bg-gray-100 dark:bg-[#22252f] border-2 ${
                                    cluster.size === 'lg' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-600'
                                } flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                                style={positions[i]}
                            >
                                <span className="font-bold text-gray-700 dark:text-gray-300">{cluster.letter}</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                    {cluster.company} ({cluster.connections})
                                </span>
                            </div>
                        );
                    })}
                    {/* Connection lines - CSS-only */}
                    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                        <line x1="30%" y1="30%" x2="55%" y2="45%" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />
                        <line x1="55%" y1="45%" x2="75%" y2="30%" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />
                        <line x1="30%" y1="30%" x2="25%" y2="65%" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="4" />
                    </svg>
                </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-[#2d3140]">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">"You are most influential within the ML Engineering clusters at OpenAI & Apple."</p>
                <button className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                    Expand Visualization
                </button>
            </div>
        </div>
    );
}

export default function NetworkPulsePage() {
    const { profile } = useApp();
    const [activeTab, setActiveTab] = useState('strategic');

    return (
        <div className="max-w-[1100px] space-y-6">
            <div className="mb-2">
                <h1 className="font-headline text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                    <span className="text-brand-600 dark:text-brand-400">Network Pulse</span>
                </h1>
            </div>

            {/* Top Row - Thought Leadership + Network Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Thought Leadership Card */}
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30 mb-4">
                        AI Score
                    </span>
                    <div className="flex items-end gap-1 mb-1">
                        <span className="text-6xl font-extrabold text-brand-600 dark:text-brand-400 font-headline leading-none">84</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Top 2%</span>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline mt-3">Thought Leadership</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                        Your professional influence has increased by <span className="font-bold text-brand-600">12%</span> this week following your recent commentary on Generative AI pipelines.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-[#2d3140]">
                        <StatCard label="Views" value="2.4k" change="14%" />
                        <StatCard label="Reach" value="18.2k" change="8%" />
                        <StatCard label="Engage" value="4.2%" change="22%" />
                    </div>
                </div>

                {/* Network Density Map */}
                <NetworkDensityMap />
            </div>

            {/* Middle Row - Presence & Voice + Engagement Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
                {/* Presence & Voice */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Presence & Voice</h2>
                        <Sparkles className="w-5 h-5 text-brand-400" />
                    </div>
                    {VOICE_STRATEGIES.map((strategy, i) => (
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
                    ))}

                    {/* Draft Thought Leadership Post */}
                    <button className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-[#22252f] hover:bg-gray-200 dark:hover:bg-[#2d3140] text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-colors cursor-pointer">
                        <BookOpen className="w-4 h-4" />
                        Draft Thought Leadership Post
                    </button>
                </div>

                {/* Active Engagement Feed */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Active Engagement Feed</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('strategic')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                    activeTab === 'strategic'
                                        ? 'bg-white dark:bg-[#1a1d27] text-gray-900 dark:text-white border border-slate-200 dark:border-[#2d3140] shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Strategic All
                            </button>
                            <button
                                onClick={() => setActiveTab('referrals')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                    activeTab === 'referrals'
                                        ? 'bg-white dark:bg-[#1a1d27] text-gray-900 dark:text-white border border-slate-200 dark:border-[#2d3140] shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Target Referrals
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {ENGAGEMENT_FEED.map((item, i) => (
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
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                                            {item.content}
                                            {item.highlight && (
                                                <span className="text-gray-500 dark:text-gray-400"> {item.highlight}</span>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-3 mt-3">
                                            {item.actions.map((action, j) => (
                                                <button
                                                    key={j}
                                                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                                        action.primary
                                                            ? 'text-brand-600 dark:text-brand-400 hover:text-brand-700'
                                                            : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                                >
                                                    {action.icon && <action.icon className="w-3.5 h-3.5" />}
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* LinkedIn Sync */}
                        <div className="flex items-center justify-end">
                            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:border-brand-300 transition-colors cursor-pointer shadow-sm">
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-bold tracking-wider uppercase text-brand-600">LinkedIn Live</span>
                                Sync Activity
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Strategy Button */}
            <div className="pt-2">
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-brand-600/20 font-headline cursor-pointer">
                    <Sparkles className="w-4 h-4" />
                    New Strategy
                </button>
            </div>
        </div>
    );
}
