import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Search, TrendingUp, Target, Layers, Zap } from 'lucide-react';
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
            <div className="flex gap-0 border-b-2 border-gray-200 mb-5">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 -mb-[2px] border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? 'text-indigo-500 border-indigo-500'
                                : 'text-slate-400 border-transparent hover:text-slate-600'
                        }`}
                    >
                        {tab.label}
                        <span className={`text-[11px] font-semibold px-1.5 py-px rounded-full ${
                            activeTab === tab.key
                                ? 'bg-indigo-50 text-indigo-500'
                                : 'bg-slate-100 text-slate-400'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}

                {/* Sort controls — right aligned */}
                {jobs.length > 0 && (
                    <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 my-1.5">
                        <button
                            onClick={() => setSortBy('score')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                sortBy === 'score' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Top Score
                        </button>
                        <button
                            onClick={() => setSortBy('latest')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                sortBy === 'latest' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Latest
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Summary Row — JobZen-inspired */}
            {jobs.length > 0 && !isMatching && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-4 gap-3 mb-5"
                >
                    {(() => {
                        const strongCount = jobs.filter(j => (j.analysis?.fit_score || j.match_score) >= 80).length;
                        const goodCount = jobs.filter(j => { const s = j.analysis?.fit_score || j.match_score; return s >= 60 && s < 80; }).length;
                        const avgScore = jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + (j.analysis?.fit_score || j.match_score || 0), 0) / jobs.length) : 0;
                        const sources = [...new Set(jobs.map(j => j.source).filter(Boolean))].length;

                        const stats = [
                            { label: 'Total Matches', value: jobs.length, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100' },
                            { label: 'Strong Matches', value: strongCount, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
                            { label: 'Avg Score', value: avgScore, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
                            { label: 'Sources', value: sources, icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50', iconBg: 'bg-violet-100' },
                        ];

                        return stats.map((stat) => (
                            <div key={stat.label} className={`${stat.bg} rounded-xl p-3.5 border border-white/60`}>
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <div className={`text-lg font-bold ${stat.color} leading-none`}>{stat.value}</div>
                                        <div className="text-[10px] font-medium text-gray-500 mt-0.5">{stat.label}</div>
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                </motion.div>
            )}

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
                        className="sticky top-2 z-40 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl px-5 py-3.5 shadow-lg shadow-indigo-500/25 flex items-center gap-4"
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
                <div className="flex flex-col items-center justify-center py-20 px-10 text-center bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="text-[15px] font-semibold text-slate-700 mb-1.5">No matches yet</div>
                    <div className="text-[13px] text-slate-400 max-w-[280px] leading-relaxed">
                        Initialize a scan to match your profile against 10,000+ jobs. Takes 1–2 minutes.
                    </div>
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
                                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-full hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
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
