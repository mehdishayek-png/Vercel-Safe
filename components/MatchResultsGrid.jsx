import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Search, Download, BrainCircuit, Target, Zap, ShieldCheck, TrendingUp, Globe, FileText, ChevronDown, Building2, ArrowUpRight } from 'lucide-react';
import { JobCard } from './JobCard';
import { ScanningRadar } from './ScanningRadar';
import { exportJobsToCSV } from '@/lib/export-csv';
import { CompanyLogo } from './ui/CompanyLogo';
import Link from 'next/link';

export function MatchResultsGrid({
    jobs,
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    displayedJobs,
    isMatching,
    searchError,
    setSearchError,
    deepAnalysisProgress,
    savedJobIds,
    profile,
    apiKeys,
    toggleSaveJob,
    toggleAppliedJob,
    appliedJobIds,
    refreshTokens,
    isPaywalled,
    initiatePayment,
    isPaymentProcessing,
    findJobs,
    freeVisibleJobs,
    searchSuggestions,
    onSuggestionClick,
}) {
    const tabs = [
        { key: 'matches', label: 'Matches', count: jobs.length },
        { key: 'saved', label: 'Saved', count: savedJobIds.size },
        ...(appliedJobIds?.size > 0 ? [{ key: 'applied', label: 'Applied', count: appliedJobIds.size }] : []),
    ];

    return (
        <>
            {/* Neural Matches Header */}
            <div className="mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight">
                            Neural Matches
                        </h2>
                        {jobs.length > 0 && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30">
                                {jobs.length}
                            </span>
                        )}
                    </div>

                    {jobs.length > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => exportJobsToCSV(displayedJobs)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                                title="Export to CSV"
                            >
                                <Download className="w-3.5 h-3.5" />
                                CSV
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs + Sort */}
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-[#2d3140]">
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2.5 text-sm font-bold flex items-center gap-1.5 -mb-px border-b-2 transition-colors cursor-pointer font-headline whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? 'text-brand-600 border-brand-600'
                                        : 'text-slate-400 border-transparent hover:text-gray-600'
                                }`}
                            >
                                {tab.label}
                                <span className={`text-[11px] font-bold px-2 py-px rounded-full ${
                                    activeTab === tab.key
                                        ? 'bg-brand-50 text-brand-600'
                                        : 'bg-slate-100 dark:bg-[#22252f] text-slate-400'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {jobs.length > 0 && (
                        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#22252f] rounded-xl p-0.5 shrink-0">
                            <button
                                onClick={() => setSortBy('score')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-headline ${
                                    sortBy === 'score' ? 'bg-white dark:bg-[#1a1d27] text-brand-600 shadow-sm' : 'text-slate-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                Top Matches
                            </button>
                            <button
                                onClick={() => setSortBy('latest')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-headline ${
                                    sortBy === 'latest' ? 'bg-white dark:bg-[#1a1d27] text-brand-600 shadow-sm' : 'text-slate-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                By Date
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Area */}
            <div className="space-y-4">
                {isMatching && !deepAnalysisProgress && (
                    <ScanningRadar />
                )}

                {searchError && !isMatching && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3"
                    >
                        <div className="text-amber-500 mt-0.5 text-base">{searchError.type === 'resume' ? '📄' : '⚠️'}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold">{searchError.message || searchError}</p>
                            <div className="flex gap-2 mt-2">
                                {searchError.canRetry && (
                                    <button
                                        onClick={() => { setSearchError(null); findJobs(); }}
                                        className="text-xs px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-bold cursor-pointer"
                                    >
                                        Retry
                                    </button>
                                )}
                                <button
                                    onClick={() => setSearchError(null)}
                                    className="text-xs px-4 py-2 text-amber-700 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {deepAnalysisProgress && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="sticky top-16 z-40 bg-gradient-to-r from-brand-600 to-secondary-DEFAULT text-white rounded-2xl px-5 py-3.5 shadow-lg shadow-brand-600/20 flex items-center gap-4"
                    >
                        <div className="relative">
                            <div className="w-7 h-7 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <Sparkles className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold font-headline">AI Deep Analysis...</div>
                            <div className="text-xs text-white/60">Batch {deepAnalysisProgress.current}/{deepAnalysisProgress.total}</div>
                        </div>
                        <div className="text-xs font-mono bg-white/20 rounded-lg px-2.5 py-1">
                            {deepAnalysisProgress.current}/{deepAnalysisProgress.total}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Empty State */}
            {displayedJobs.length === 0 && !isMatching && !searchError && (
                <div className="space-y-5 mt-2 relative z-10">
                    {/* Hero card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-secondary-DEFAULT/5 dark:from-brand-900/20 dark:via-[#1a1d27] dark:to-secondary-DEFAULT/10 rounded-2xl border border-brand-100/60 dark:border-brand-800/30 p-8 text-center shadow-sm">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-brand-200/30 to-secondary-DEFAULT/20 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr from-emerald-200/20 to-sky-200/15 rounded-full blur-2xl pointer-events-none" />
                        <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-secondary-DEFAULT/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Search className="w-7 h-7 text-brand-600" />
                            </div>
                            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 font-headline">Ready to find your next role</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                Upload your resume, set your preferences, and hit Scan. Midas will score thousands of live jobs against your profile in under a minute.
                            </p>
                        </div>
                    </div>

                    {/* Feature cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/40 dark:to-brand-800/20 rounded-xl flex items-center justify-center mb-3">
                                <BrainCircuit className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            </div>
                            <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline">AI-Powered Matching</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Our scoring engine evaluates keyword overlap, seniority fit, location match, role family alignment, and job depth.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 rounded-xl flex items-center justify-center mb-3">
                                <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline">4 Job Sources</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                We aggregate from LinkedIn, Indeed, Glassdoor, and Fantastic.Jobs — casting a wide net so you don't miss opportunities.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-800/20 rounded-xl flex items-center justify-center mb-3">
                                <Target className="w-5 h-5 text-secondary-DEFAULT dark:text-violet-400" />
                            </div>
                            <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline">Deep Analysis</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Get AI-powered fit scores, salary estimates, skill gap analysis, and a personalized verdict for every match.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-800/20 rounded-xl flex items-center justify-center mb-3">
                                <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                            </div>
                            <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline">Cover Letters</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Generate a tailored 2-paragraph cover letter for any matched job with a single click.
                            </p>
                        </div>
                    </div>

                    {/* How scoring works */}
                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-4 flex items-center gap-1.5 font-headline">
                            <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
                            How scoring works
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="bg-brand-50/50 dark:bg-brand-900/20 rounded-xl py-4 px-3">
                                <div className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 mb-1 font-headline">7</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold font-headline">Scoring Signals</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Keywords, seniority, location, role family, depth, recency, prestige</div>
                            </div>
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl py-4 px-3">
                                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-1 font-headline">0–100</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold font-headline">Match Score</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Composite score with multipliers — 80+ is an excellent fit</div>
                            </div>
                            <div className="bg-violet-50/50 dark:bg-violet-900/20 rounded-xl py-4 px-3">
                                <div className="text-2xl font-extrabold text-secondary-DEFAULT dark:text-violet-400 mb-1 font-headline">&lt;60s</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold font-headline">Scan Time</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Fetches and scores hundreds of jobs in under a minute</div>
                            </div>
                        </div>
                    </div>

                    {/* Privacy footer */}
                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 py-2">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> Resumes never stored</span>
                        <span className="w-px h-3 bg-slate-200" />
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-brand-400" /> 5 free scans/day</span>
                        <span className="w-px h-3 bg-slate-200" />
                        <span className="flex items-center gap-1"><Download className="w-3 h-3 text-slate-400" /> Export to CSV</span>
                    </div>
                </div>
            )}

            {/* Smart search suggestions */}
            {searchSuggestions && searchSuggestions.length > 0 && displayedJobs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mt-2"
                >
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 font-headline">
                        Few results? Try searching for related roles:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {searchSuggestions.map((title, i) => (
                            <button
                                key={i}
                                onClick={() => onSuggestionClick?.(title)}
                                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#1a1d27] border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/20 hover:border-amber-300 transition-all cursor-pointer"
                            >
                                {title}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Job Cards */}
            <GroupedJobList
                displayedJobs={displayedJobs}
                profile={profile}
                apiKeys={apiKeys}
                savedJobIds={savedJobIds}
                appliedJobIds={appliedJobIds}
                toggleSaveJob={toggleSaveJob}
                toggleAppliedJob={toggleAppliedJob}
                refreshTokens={refreshTokens}
            />
        </>
    );
}

// ─── Company Grouping ────────────────────────────────────────────────────────

function CompanyGroupHeader({ company, jobs, isOpen, onToggle }) {
    const bestScore = Math.max(...jobs.map(j => j.analysis?.fit_score || j.match_score || 0));
    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center gap-3 p-3.5 px-4 bg-gradient-to-r from-midas-surface-low to-white dark:from-[#1e2130] dark:to-[#1a1d27] border border-slate-200/60 dark:border-[#2d3140] rounded-2xl hover:border-brand-200 transition-all cursor-pointer shadow-sm"
        >
            <CompanyLogo company={company} size={28} colorIndex={0} />
            <div className="flex-1 min-w-0 text-left">
                <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100 font-headline">{company}</span>
                <span className="text-[11px] text-slate-400 ml-2">{jobs.length} open roles</span>
            </div>
            <span className="text-[11px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2.5 py-0.5 rounded-lg">
                Top: {Math.round(bestScore)}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    );
}

function GroupedJobList({ displayedJobs, profile, apiKeys, savedJobIds, appliedJobIds, toggleSaveJob, toggleAppliedJob, refreshTokens }) {
    const [expandedGroups, setExpandedGroups] = useState({});
    const GROUP_THRESHOLD = 3;

    const companyCounts = {};
    for (const job of displayedJobs) {
        const co = (job.company || 'Unknown').trim();
        companyCounts[co] = (companyCounts[co] || 0) + 1;
    }

    const renderItems = [];
    const processedCompanies = new Set();

    for (let i = 0; i < displayedJobs.length; i++) {
        const job = displayedJobs[i];
        const co = (job.company || 'Unknown').trim();

        if (companyCounts[co] >= GROUP_THRESHOLD && !processedCompanies.has(co)) {
            processedCompanies.add(co);
            const groupJobs = displayedJobs.filter(j => (j.company || '').trim() === co);
            renderItems.push({ type: 'group', company: co, jobs: groupJobs });
        } else if (companyCounts[co] < GROUP_THRESHOLD) {
            renderItems.push({ type: 'job', job, index: i });
        }
    }

    const toggleGroup = (company) => {
        setExpandedGroups(prev => ({ ...prev, [company]: !prev[company] }));
    };

    return (
        <div className="space-y-3 mt-4">
            <AnimatePresence>
                {renderItems.map((item, idx) => {
                    if (item.type === 'group') {
                        const isOpen = expandedGroups[item.company];
                        return (
                            <motion.div
                                key={`group-${item.company}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2"
                            >
                                <CompanyGroupHeader
                                    company={item.company}
                                    jobs={item.jobs}
                                    isOpen={isOpen}
                                    onToggle={() => toggleGroup(item.company)}
                                />
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-2 pl-3 border-l-2 border-brand-200 dark:border-brand-800 ml-4"
                                        >
                                            {item.jobs.map((job, j) => (
                                                <JobCard
                                                    key={job.id || job.apply_url || `group-${item.company}-${j}`}
                                                    job={job}
                                                    profile={profile}
                                                    apiKeys={apiKeys}
                                                    onSave={toggleSaveJob}
                                                    isSaved={savedJobIds.has(job.apply_url)}
                                                    onApply={toggleAppliedJob}
                                                    isApplied={appliedJobIds?.has(job.apply_url)}
                                                    onTokensUpdated={refreshTokens}
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    }

                    return (
                        <JobCard
                            key={item.job.id || item.job.apply_url || `job-${item.index}`}
                            job={item.job}
                            profile={profile}
                            apiKeys={apiKeys}
                            onSave={toggleSaveJob}
                            isSaved={savedJobIds.has(item.job.apply_url)}
                            onApply={toggleAppliedJob}
                            isApplied={appliedJobIds?.has(item.job.apply_url)}
                            onTokensUpdated={refreshTokens}
                        />
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
