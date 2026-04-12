import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Search, Download, BrainCircuit, Target, Zap, ShieldCheck, TrendingUp, Globe, FileText, ChevronDown, Building2, RefreshCw } from 'lucide-react';
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
    hasSearched,
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
            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                            activeTab === tab.key
                                ? 'bg-surface-300 text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                        }`}
                    >
                        {tab.label}
                        <span className={`text-[11px] font-semibold px-1.5 py-px rounded-full ${
                            activeTab === tab.key
                                ? 'bg-surface-400/20 text-gray-700'
                                : 'bg-surface-200 text-gray-400'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}

                {jobs.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => findJobs(true)}
                        disabled={isMatching}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Fetch fresh results (bypasses cache)"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                    <button
                        onClick={() => exportJobsToCSV(displayedJobs)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                        title="Export to CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                    </button>
                    <div className="flex items-center gap-0.5 rounded-full p-0.5">
                        <button
                            onClick={() => setSortBy('score')}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                                sortBy === 'score' ? 'bg-surface-300 text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Score
                        </button>
                        <button
                            onClick={() => setSortBy('latest')}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                                sortBy === 'latest' ? 'bg-surface-300 text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                    <ScanningRadar jobs={jobs} />
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
                        className="sticky top-16 z-40 bg-flow-gradient text-white rounded-2xl px-5 py-3 shadow-glow flex items-center gap-4"
                    >
                        <div className="relative">
                            <div className="w-7 h-7 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <Sparkles className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">AI Deep Analysis...</div>
                            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1.5">
                                <div className="bg-white rounded-full h-1.5 transition-all duration-500" style={{ width: `${Math.round((deepAnalysisProgress.current / deepAnalysisProgress.total) * 100)}%` }} />
                            </div>
                            <div className="text-xs text-white/60 mt-1">Batch {deepAnalysisProgress.current}/{deepAnalysisProgress.total}</div>
                        </div>
                        <div className="text-xs font-mono bg-white/20 rounded-full px-2.5 py-0.5">
                            {deepAnalysisProgress.current}/{deepAnalysisProgress.total}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Empty State — rich pre-scan info */}
            {displayedJobs.length === 0 && !isMatching && !searchError && !hasSearched && (
                <div className="space-y-5 mt-2 relative z-10">
                    {/* Hero card */}
                    <div className="relative overflow-hidden glass-panel rounded-[2rem] border border-transparent p-8 text-center">
                        {/* Flow-gradient background element */}
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-flow-gradient" />
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-flow-gradient opacity-10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-flow-gradient opacity-[0.07] rounded-full blur-3xl pointer-events-none" />
                        <div className="relative">
                            <div className="w-14 h-14 bg-flow-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
                                <Search className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="font-headline text-xl font-bold text-gray-900 mb-2">Ready to find your next role</h2>
                            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                                Upload your resume on the left, set your preferences, and hit Scan. Midas will score thousands of live jobs against your profile in under a minute.
                            </p>
                        </div>
                    </div>

                    {/* Feature cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-surface-50/80 rounded-[2rem] border border-transparent p-5 hover:shadow-xl transition-shadow">
                            <div className="w-9 h-9 bg-gradient-to-br from-brand-100 to-blue-100 rounded-lg flex items-center justify-center mb-3">
                                <BrainCircuit className="w-4.5 h-4.5 text-brand-600" />
                            </div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1">AI-Powered Matching</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                Our scoring engine evaluates keyword overlap, seniority fit, location match, role family alignment, and job depth — not just keywords.
                            </p>
                        </div>
                        <div className="bg-surface-50/80 rounded-[2rem] border border-transparent p-5 hover:shadow-xl transition-shadow">
                            <div className="w-9 h-9 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center mb-3">
                                <Globe className="w-4.5 h-4.5 text-emerald-600" />
                            </div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1">4 Job Sources</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                We aggregate from LinkedIn, Indeed, Glassdoor, and Fantastic.Jobs — casting a wide net so you don't miss opportunities.
                            </p>
                        </div>
                        <div className="bg-surface-50/80 rounded-[2rem] border border-transparent p-5 hover:shadow-xl transition-shadow">
                            <div className="w-9 h-9 bg-gradient-to-br from-brand-100 to-accent-100 rounded-lg flex items-center justify-center mb-3">
                                <Target className="w-4.5 h-4.5 text-brand-600" />
                            </div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1">Deep Analysis</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                Expand any job card to get AI-powered fit scores, salary estimates, skill gap analysis, and a personalized verdict.
                            </p>
                        </div>
                        <div className="bg-surface-50/80 rounded-[2rem] border border-transparent p-5 hover:shadow-xl transition-shadow">
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
                    <div className="bg-surface-50/80 rounded-[2rem] border border-transparent p-5">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
                            How scoring works
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="bg-brand-50/50 rounded-lg py-3 px-2">
                                <div className="text-2xl font-bold text-brand-600 mb-1">7</div>
                                <div className="text-[11px] text-gray-500 font-medium">Scoring Signals</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">Keywords, seniority, location, role family, depth, recency, prestige</div>
                            </div>
                            <div className="bg-emerald-50/50 rounded-lg py-3 px-2">
                                <div className="text-2xl font-bold text-emerald-600 mb-1">0-100</div>
                                <div className="text-[11px] text-gray-500 font-medium">Match Score</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">Scores are based on real keywords, no arbitrary tiers</div>
                            </div>
                            <div className="bg-accent-50/50 rounded-lg py-3 px-2">
                                <div className="text-2xl font-bold text-brand-600 mb-1">&lt;60s</div>
                                <div className="text-[11px] text-gray-500 font-medium">Scan Time</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">Fetches and scores hundreds of jobs in under a minute</div>
                            </div>
                        </div>
                    </div>

                    {/* Privacy footer */}
                    <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 py-2">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> Resumes never stored</span>
                        <span className="w-px h-3 bg-surface-200" />
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-brand-400" /> 5 free scans/day</span>
                        <span className="w-px h-3 bg-surface-200" />
                        <span className="flex items-center gap-1"><Download className="w-3 h-3 text-gray-400" /> Export to CSV</span>
                    </div>
                </div>
            )}

            {/* Empty State — 0 Results Found */}
            {displayedJobs.length === 0 && !isMatching && !searchError && hasSearched && (
                <div className="flex flex-col items-center justify-center p-12 mt-4 text-center glass-panel rounded-[2rem] border border-transparent">
                    <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No matching jobs found</h3>
                    <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
                        We couldn't find any highly-scored roles matching these parameters right now. Expand your location or adjust your target title to cast a wider net.
                    </p>
                    <button 
                        onClick={() => findJobs()}
                        className="px-5 py-2.5 bg-brand-50 text-brand-700 font-semibold rounded-full hover:bg-brand-100 transition-colors text-sm"
                    >
                        Try scanning again
                    </button>
                </div>
            )}

            {/* Smart search suggestions (shown when results are sparse) */}
            {searchSuggestions && searchSuggestions.length > 0 && displayedJobs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mt-2"
                >
                    <p className="text-xs font-medium text-amber-800 mb-2">
                        Few results? Try searching for related roles:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {searchSuggestions.map((title, i) => (
                            <button
                                key={i}
                                onClick={() => onSuggestionClick?.(title)}
                                className="px-3 py-1.5 text-xs font-medium glass-card border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer"
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
            className="w-full flex items-center gap-3 p-3 px-4 glass-panel border border-transparent rounded-[2rem] hover:border-brand-200 transition-all cursor-pointer"
        >
            <CompanyLogo company={company} size={28} colorIndex={0} />
            <div className="flex-1 min-w-0 text-left">
                <span className="text-[13px] font-semibold text-gray-900">{company}</span>
                <span className="text-[11px] text-gray-400 ml-2">{jobs.length} open roles</span>
            </div>
            <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                Top Score: {Math.round(bestScore)}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    );
}

function GroupedJobList({ displayedJobs, profile, apiKeys, savedJobIds, appliedJobIds, toggleSaveJob, toggleAppliedJob, refreshTokens }) {
    const [expandedGroups, setExpandedGroups] = useState({});
    const GROUP_THRESHOLD = 3; // Group companies with 3+ jobs

    const topJob = displayedJobs.length > 0 ? displayedJobs[0] : null;
    const topJobId = topJob && (topJob.match_score >= 85 || topJob.analysis?.fit_score >= 85) ? (topJob.id || topJob.apply_url) : null;

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
                                            className="space-y-2 pl-3 border-l-2 border-brand-100 ml-4"
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
                                                    autoAnalyze={topJobId && (job.id === topJobId || job.apply_url === topJobId)}
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
                            autoAnalyze={topJobId && (item.job.id === topJobId || item.job.apply_url === topJobId)}
                        />
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
