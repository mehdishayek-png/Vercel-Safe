import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Bookmark, Sparkles, Lock, Search } from 'lucide-react';
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
    return (
        <>
            {/* Tab Bar + Sort Controls */}
            <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl p-2 mb-6 flex items-center justify-between shadow-sm">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'matches' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4" />
                            Matches <span className="opacity-50 text-xs">({jobs.length})</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'saved' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Bookmark className="w-4 h-4" />
                            Saved <span className="opacity-50 text-xs">({savedJobIds.size})</span>
                        </div>
                    </button>
                </div>
                {jobs.length > 0 && (
                    <div className="flex gap-1 bg-gray-100/80 rounded-lg p-0.5">
                        <button
                            onClick={() => setSortBy('score')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortBy === 'score' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Top Score
                        </button>
                        <button
                            onClick={() => setSortBy('latest')}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortBy === 'latest' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Latest
                        </button>
                    </div>
                )}
            </div>

            {/* Status Area: Scanning / Error / Deep Analysis */}
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
                        <div className="text-amber-500 mt-0.5 text-lg">{searchError.type === 'resume' ? '📄' : '⚠️'}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-amber-800 font-medium">{searchError.message || searchError}</p>
                            <div className="flex gap-2 mt-3">
                                {searchError.canRetry && (
                                    <button
                                        onClick={() => { setSearchError(null); findJobs(); }}
                                        className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                                    >
                                        Retry Search
                                    </button>
                                )}
                                <button
                                    onClick={() => setSearchError(null)}
                                    className="text-xs px-3 py-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
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
                        className="sticky top-2 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl px-5 py-3.5 shadow-lg shadow-indigo-500/25 flex items-center gap-4"
                    >
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <Sparkles className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">AI Deep Analysis in Progress...</div>
                            <div className="text-xs text-white/70">Batch {deepAnalysisProgress.current} of {deepAnalysisProgress.total} — Scores will re-sort when complete</div>
                        </div>
                        <div className="text-xs font-mono bg-white/20 rounded-lg px-2.5 py-1">
                            {deepAnalysisProgress.current}/{deepAnalysisProgress.total}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Empty State */}
            {displayedJobs.length === 0 && !isMatching && !searchError && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Search className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No matches yet</h3>
                    <p className="text-sm text-gray-400 max-w-sm">
                        Upload your resume and hit Scan to find jobs matched to your skills.
                    </p>
                </div>
            )}

            {/* Job Cards */}
            <div className="space-y-4 mt-4">
                <AnimatePresence>
                    {displayedJobs.map((job, i) => {
                        const shouldBlur = isPaywalled && activeTab === 'matches' && i >= freeVisibleJobs;
                        if (shouldBlur && i === freeVisibleJobs) {
                            return (
                                <div key="paywall-cta">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative rounded-2xl overflow-hidden mb-4"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white z-10 flex flex-col items-center justify-center">
                                            <Lock className="w-8 h-8 text-indigo-500 mb-3" />
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">+{displayedJobs.length - freeVisibleJobs} more matches found</h3>
                                            <p className="text-sm text-gray-500 mb-4">Unlock all results with tokens</p>
                                            <button
                                                onClick={initiatePayment}
                                                disabled={isPaymentProcessing}
                                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-full hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                                            >
                                                {isPaymentProcessing ? 'Processing...' : 'Unlock All — Get 50 Tokens for ₹399'}
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
