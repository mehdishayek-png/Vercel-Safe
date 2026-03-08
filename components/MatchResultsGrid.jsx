import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Search } from 'lucide-react';
import { JobCard } from './JobCard';
import { ScanningRadar } from './ScanningRadar';

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
    refreshTokens,
    isPaywalled,
    initiatePayment,
    isPaymentProcessing,
    findJobs,
    freeVisibleJobs,
}) {
    const tabs = [
        { key: 'matches', label: 'Matches', count: jobs.length },
        { key: 'saved', label: 'Saved', count: savedJobIds.size },
    ];

    return (
        <>
            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b border-surface-200 mb-5">
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
                    <div className="ml-auto flex items-center gap-0.5 bg-surface-100 rounded-lg p-0.5">
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

            {/* Empty State */}
            {displayedJobs.length === 0 && !isMatching && !searchError && (
                <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                    <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mb-4">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">No matches yet</div>
                    <div className="text-xs text-gray-400 max-w-[260px] leading-relaxed">
                        Upload your resume and run a scan to match against thousands of jobs.
                    </div>
                </div>
            )}

            {/* Job Cards */}
            <div className="space-y-3 mt-4">
                <AnimatePresence>
                    {displayedJobs.map((job, i) => {
                        const shouldBlur = isPaywalled && activeTab === 'matches' && i >= freeVisibleJobs;
                        if (shouldBlur && i === freeVisibleJobs) {
                            return (
                                <div key="paywall-cta">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative rounded-xl overflow-hidden mb-3"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white z-10 flex flex-col items-center justify-center">
                                            <Lock className="w-7 h-7 text-brand-500 mb-2" />
                                            <h3 className="text-base font-bold text-gray-900 mb-1">+{displayedJobs.length - freeVisibleJobs} more matches</h3>
                                            <p className="text-sm text-gray-500 mb-3">Unlock all results with tokens</p>
                                            <button
                                                onClick={initiatePayment}
                                                disabled={isPaymentProcessing}
                                                className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-button disabled:opacity-50 cursor-pointer"
                                            >
                                                {isPaymentProcessing ? 'Processing...' : 'Get 50 Tokens — ₹399'}
                                            </button>
                                        </div>
                                        <div className="filter blur-md pointer-events-none">
                                            <JobCard
                                                job={job}
                                                profile={profile}
                                                apiKeys={apiKeys}
                                                onSave={toggleSaveJob}
                                                isSaved={false}
                                                onTokensUpdated={refreshTokens}
                                            />
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        }
                        if (shouldBlur) return null;
                        return (
                            <JobCard
                                key={job.id || job.apply_url || `job-${i}`}
                                job={job}
                                profile={profile}
                                apiKeys={apiKeys}
                                onSave={toggleSaveJob}
                                isSaved={savedJobIds.has(job.apply_url)}
                                onTokensUpdated={refreshTokens}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>
        </>
    );
}
