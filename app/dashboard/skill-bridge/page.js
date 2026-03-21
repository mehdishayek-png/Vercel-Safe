'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X, TrendingUp, Code2, Users, ArrowRight, Download, ChevronDown, Loader2 } from 'lucide-react';

const ICON_MAP = { TrendingUp, Code2, Users };

function SkillBar({ skill }) {
    const percentage = Math.min(skill.level, 100);
    return (
        <div className="flex items-center gap-4 py-3">
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{skill.name}</span>
                    {skill.status === 'met' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Target Met
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-orange-500">
                            {skill.gap}% Gap
                        </span>
                    )}
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            skill.status === 'met'
                                ? 'bg-gradient-to-r from-brand-500 to-brand-600'
                                : 'bg-gradient-to-r from-brand-400 to-brand-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

function CircularProgress({ value, size = 180, strokeWidth = 10 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100 dark:text-gray-700" />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#sb-gradient)" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
                <defs>
                    <linearGradient id="sb-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4F46E5" />
                        <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white font-headline">{value}%</span>
                <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mt-1">Core Match</span>
            </div>
        </div>
    );
}

export default function SkillBridgePage() {
    const { savedJobsData, profile } = useApp();
    const [showBridgePath, setShowBridgePath] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const targetJob = selectedJob || savedJobsData[0] || null;

    const runAnalysis = useCallback(async (job) => {
        if (!profile) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/skill-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, targetJob: job }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Analysis failed');
            }
            const data = await res.json();
            setAnalysis(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [profile]);

    // Auto-run analysis when profile or target changes
    useEffect(() => {
        if (profile) {
            runAnalysis(targetJob);
        }
    }, [profile, targetJob, runAnalysis]);

    const skills = analysis?.skills || [];
    const coreMatch = analysis?.coreMatch || 0;
    const bridgeActions = analysis?.bridgeActions || [];
    const estimatedWeeks = analysis?.estimatedWeeks || 0;
    const targetTitle = analysis?.targetTitle || targetJob?.title || 'Target Role';
    const targetCompany = analysis?.targetCompany || targetJob?.company || 'Target Company';

    return (
        <div className="max-w-[1100px] space-y-6">
            <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30 mb-3">
                    AI Gap Analysis
                </span>
                <h1 className="font-headline text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                    Skill Bridge
                </h1>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    {profile ? (
                        <>Comparison with <span className="font-semibold text-brand-600">{targetTitle}</span> at <span className="font-semibold text-brand-600">{targetCompany}</span></>
                    ) : (
                        'Upload your resume to see AI skill gap analysis'
                    )}
                </p>
            </div>

            {/* Job Selector */}
            {savedJobsData.length > 1 && (
                <div className="relative">
                    <button
                        onClick={() => {
                            const idx = savedJobsData.indexOf(targetJob);
                            const next = savedJobsData[(idx + 1) % savedJobsData.length];
                            setSelectedJob(next);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:border-brand-300 transition-colors cursor-pointer"
                    >
                        Compare with different role
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            )}

            {!profile ? (
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-12 shadow-sm text-center">
                    <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-7 h-7 text-brand-400" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-headline">Upload Your Resume First</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">Go to the search page and upload your resume so the AI can analyze your skills against target roles.</p>
                </div>
            ) : isLoading ? (
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-16 shadow-sm text-center">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Analyzing skill gaps...</p>
                </div>
            ) : error ? (
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-red-200 dark:border-red-800/30 p-8 shadow-sm text-center">
                    <p className="text-sm text-red-600">{error}</p>
                    <button onClick={() => runAnalysis(targetJob)} className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold cursor-pointer">
                        Retry
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
                    {/* Left Column - Analysis */}
                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-8 shadow-sm">
                        <div className="flex justify-center mb-8">
                            <CircularProgress value={coreMatch} />
                        </div>
                        <div className="space-y-1">
                            {skills.map((skill) => (
                                <SkillBar key={skill.name} skill={skill} />
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-[#2d3140]">
                            <button
                                onClick={() => runAnalysis(targetJob)}
                                className="w-full px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-brand-600/20 font-headline cursor-pointer"
                            >
                                New Analysis
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Actionable Bridge Path */}
                    {showBridgePath && bridgeActions.length > 0 && (
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm h-fit">
                            <div className="flex items-start justify-between mb-1">
                                <div>
                                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Actionable Bridge Path</h2>
                                    <p className="text-xs text-slate-400 mt-1">Projected timeline to 95% match: {estimatedWeeks} weeks</p>
                                </div>
                                <button onClick={() => setShowBridgePath(false)} className="p-1 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-6 space-y-6">
                                {bridgeActions.map((action, i) => {
                                    const IconComponent = ICON_MAP[action.icon] || TrendingUp;
                                    const colorMap = { course: 'text-brand-600 bg-brand-50', project: 'text-emerald-600 bg-emerald-50', mentorship: 'text-violet-600 bg-violet-50' };
                                    return (
                                        <div key={i} className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[action.type] || 'text-brand-600 bg-brand-50'}`}>
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{action.title}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{action.description}</p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    {action.tag && (
                                                        <span className={`text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-1 rounded-md ${
                                                            action.type === 'project'
                                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                                        }`}>
                                                            {action.tag}
                                                        </span>
                                                    )}
                                                    {action.type === 'mentorship' ? (
                                                        <button className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-bold transition-colors hover:bg-gray-700 dark:hover:bg-gray-200 cursor-pointer">
                                                            {action.action}
                                                        </button>
                                                    ) : (
                                                        <button className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 transition-colors underline underline-offset-2 cursor-pointer">
                                                            {action.action}
                                                            {action.type === 'project' ? <Download className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-8 pt-5 border-t border-slate-100 dark:border-[#2d3140] flex items-center justify-end gap-3">
                                <button className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer">
                                    Save Report
                                </button>
                                <button className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-brand-600/20 cursor-pointer">
                                    Initiate Bridge Path
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
