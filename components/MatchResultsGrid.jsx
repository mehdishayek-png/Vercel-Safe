import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Search, Download, BrainCircuit, Target, Zap, ShieldCheck, TrendingUp, Globe, FileText, ChevronDown, Building2 } from 'lucide-react';
import { JobCard } from './JobCard';
import { ScanningRadar } from './ScanningRadar';
import { exportJobsToCSV } from '@/lib/export-csv';
import { CompanyLogo } from './ui/CompanyLogo';

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
            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b border-surface-200 mb-5 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 -mb-px border-b-2 transition-colors cursor-pointer ${
                            activeTab === tab.key
                                ? 'text-brand-600 border-brand-600'
                                : 'text-gray-400 border-transparent hover:text-gray-600'
                        }`}
                    >
                        {tab.label}
                        <span className={`text-[11px] font-semibold px-1.5 py-px rounded-md ${
                            activeTab === tab.key
                                ? 'bg-brand-50 text-brand-600'
                                : 'bg-surface-100 text-gray-400'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}

                {jobs.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => exportJobsToCSV(displayedJobs)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                        title="Export to CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                    </button>
                    <div className="flex items-center gap-0.5 bg-surface-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setSortBy('score')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                sortBy === 'score' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Score
                        </button>
                        <button
                            onClick={() => setSortBy('latest')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                sortBy === 'latest' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Latest
                        </button>
                    </div>
                    </div>
                )}
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
                        className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
                    >
                        <div className="text-amber-500 mt-0.5 text-base">{searchError.type === 'resume' ? '📄' : '⚠️'}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-amber-800 font-medium">{searchError.message || searchError}</p>
                            <div className="flex gap-2 mt-2">
                                {searchError.canRetry && (
                                    <button
                                        onClick={() => { setSearchError(null); findJobs(); }}
                                        className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium cursor-pointer"
                                    >
                                        Retry
                                    </button>
                                )}
                                <button
                                    onClick={() => setSearchError(null)}
                                    className="text-xs px-3 py-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
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
                        className="sticky top-16 z-40 bg-brand-600 text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-4"
                    >
                        <div className="relative">
                            <div className="w-7 h-7 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <Sparkles className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">AI Deep Analysis...</div>
                            <div className="text-xs text-white/60">Batch {deepAnalysisProgress.current}/{deepAnalysisProgress.total}</div>
                        </div>
                        <div className="text-xs font-mono bg-white/20 rounded-md px-2 py-0.5">
                            {deepAnalysisProgress.current}/{deepAnalysisProgress.total}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Empty State — rich pre-scan info */}
            {displayedJobs.length === 0 && !isMatching && !searchError && (
                <div className="space-y-5 mt-2 relative z-10">
                    {/* Hero card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 rounded-2xl border border-indigo-100/60 p-8 text-center shadow-sm">
                        {/* Decorative blobs */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-indigo-200/30 to-violet-200/20 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr from-teal-200/20 to-sky-200/15 rounded-full blur-2xl pointer-events-none" />
                        <div className="relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Search className="w-7 h-7 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to find your next role</h2>
                            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                                Upload your resume on the left, set your preferences, and hit Scan. Midas will score thousands of live jobs against your profile in under a minute.
                            </p>
                        </div>
                    </div>

                    {/* Feature cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-white to-indigo-50/40 rounded-xl border border-indigo-100/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-lg flex items-center justify-center mb-3">
                                <BrainCircuit className="w-4.5 h-4.5 text-indigo-600" />
                            </div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1">AI-Powered Matching</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                Our scoring engine evaluates keyword overlap, seniority fit, location match, role family alignment, and job depth — not just keywords.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-white to-emerald-50/40 rounded-xl border border-emerald-100/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-9 h-9 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center mb-3">
                                <Globe className="w-4.5 h-4.5 text-emerald-600" />
                            </div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1">4 Job Sources</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                We aggregate from LinkedIn, Indeed, Glassdoor, and Fantastic.Jobs — casting a wide net so you don't miss opportunities.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-white to-violet-50/40 rounded-xl border border-violet-100/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-9 h-9 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center mb-3">
                                <Target className="w-4.5 h-4.5 text-violet-600" />
                            </div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1">Deep Analysis</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                Expand any job card to get AI-powered fit scores, salary estimates, skill gap analysis, and a personalized verdict.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-white to-sky-50/40 rounded-xl border border-sky-100/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-9 h-9 bg-gradient-to-br from-sky-100 to-blue-100 rounded-lg flex items-center justify-center mb-3">
                                <FileText className="w-4.5 h-4.5 text-sky-600" />
                            </div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1">Cover Letters</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                Generate a tailored 2-paragraph cover letter for any matched job with a single click, then copy and customize.
                            </p>
                        </div>
                    </div>

                    {/* How scoring works */}
                    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl border border-slate-200/60 p-5 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
                            How scoring works
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="bg-indigo-50/50 rounded-lg py-3 px-2">
                                <div className="text-2xl font-bold text-indigo-600 mb-1">7</div>
                                <div className="text-[11px] text-gray-500 font-medium">Scoring Signals</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">Keywords, seniority, location, role family, depth, recency, prestige</div>
                            </div>
                            <div className="bg-emerald-50/50 rounded-lg py-3 px-2">
                                <div className="text-2xl font-bold text-emerald-600 mb-1">0–100</div>
                                <div className="text-[11px] text-gray-500 font-medium">Match Score</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">Composite score with multipliers — 80+ is an excellent fit</div>
                            </div>
                            <div className="bg-violet-50/50 rounded-lg py-3 px-2">
                                <div className="text-2xl font-bold text-violet-600 mb-1">&lt;60s</div>
                                <div className="text-[11px] text-gray-500 font-medium">Scan Time</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">Fetches and scores hundreds of jobs in under a minute</div>
                            </div>
                        </div>
                    </div>

                    {/* Privacy footer */}
                    <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 py-2">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> Resumes never stored</span>
                        <span className="w-px h-3 bg-surface-200" />
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-indigo-400" /> 5 free scans/day</span>
                        <span className="w-px h-3 bg-surface-200" />
                        <span className="flex items-center gap-1"><Download className="w-3 h-3 text-gray-400" /> Export to CSV</span>
                    </div>
                </div>
            )}

            {/* Smart search suggestions (shown when results are sparse) */}
            {searchSuggestions && searchSuggestions.length > 0 && displayedJobs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-2"
                >
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2">
                        Few results? Try searching for related roles:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {searchSuggestions.map((title, i) => (
                            <button
                                key={i}
                                onClick={() => onSuggestionClick?.(title)}
                                className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#1a1d27] border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 hover:border-amber-300 transition-all cursor-pointer"
                            >
                                {title}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Job Cards — with company grouping */}
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
            className="w-full flex items-center gap-3 p-3 px-4 bg-gradient-to-r from-surface-50 to-white dark:from-[#1e2130] dark:to-[#1a1d27] border border-surface-200 dark:border-[#2d3140] rounded-xl hover:border-brand-200 transition-all cursor-pointer"
        >
            <CompanyLogo company={company} size={28} colorIndex={0} />
            <div className="flex-1 min-w-0 text-left">
                <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{company}</span>
                <span className="text-[11px] text-gray-400 ml-2">{jobs.length} open roles</span>
            </div>
            <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-md">
                Top: {Math.round(bestScore)}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    );
}

function GroupedJobList({ displayedJobs, profile, apiKeys, savedJobIds, appliedJobIds, toggleSaveJob, toggleAppliedJob, refreshTokens }) {
    const [expandedGroups, setExpandedGroups] = useState({});
    const GROUP_THRESHOLD = 3; // Group companies with 3+ jobs

    // Count jobs per company
    const companyCounts = {};
    for (const job of displayedJobs) {
        const co = (job.company || 'Unknown').trim();
        companyCounts[co] = (companyCounts[co] || 0) + 1;
    }

    // Build render list: singles stay as-is, grouped companies get a header
    const renderItems = [];
    const processedCompanies = new Set();

    for (let i = 0; i < displayedJobs.length; i++) {
        const job = displayedJobs[i];
        const co = (job.company || 'Unknown').trim();

        if (companyCounts[co] >= GROUP_THRESHOLD && !processedCompanies.has(co)) {
            // First encounter of a grouped company — insert group header
            processedCompanies.add(co);
            const groupJobs = displayedJobs.filter(j => (j.company || '').trim() === co);
            renderItems.push({ type: 'group', company: co, jobs: groupJobs });
        } else if (companyCounts[co] < GROUP_THRESHOLD) {
            // Ungrouped — render normally
            renderItems.push({ type: 'job', job, index: i });
        }
        // Grouped jobs that aren't the first encounter are skipped (rendered inside the group)
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
                                            className="space-y-2 pl-3 border-l-2 border-brand-100 dark:border-brand-800 ml-4"
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

                    // Regular ungrouped job
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
