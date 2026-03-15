'use client';
import { Bookmark, Search, Trash2, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { JobCard } from '@/components/JobCard';
import { exportJobsToCSV } from '@/lib/export-csv';
import { useState } from 'react';

export default function SavedJobsPage() {
    const { savedJobsData, savedJobIds, toggleSaveJob, toggleAppliedJob, appliedJobIds, profile, apiKeys, refreshTokens } = useApp();
    const [sortBy, setSortBy] = useState('score');

    const sortedJobs = [...savedJobsData].sort((a, b) => {
        if (sortBy === 'latest') {
            const dateA = new Date(a.date_posted || a.posted_date || 0).getTime();
            const dateB = new Date(b.date_posted || b.posted_date || 0).getTime();
            return dateB - dateA;
        }
        return (b.match_score || 0) - (a.match_score || 0);
    });

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Saved Jobs</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{savedJobsData.length} job{savedJobsData.length !== 1 ? 's' : ''} saved</p>
                </div>
                {savedJobsData.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => exportJobsToCSV(sortedJobs)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                        >
                            Export CSV
                        </button>
                        <div className="flex items-center gap-0.5 bg-surface-100 rounded-lg p-0.5">
                            <button onClick={() => setSortBy('score')} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${sortBy === 'score' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>Score</button>
                            <button onClick={() => setSortBy('latest')} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${sortBy === 'latest' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>Latest</button>
                        </div>
                    </div>
                )}
            </div>

            {sortedJobs.length === 0 ? (
                <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
                    <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Bookmark className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Jobs Yet</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                        Save jobs you're interested in while searching. They'll appear here for easy access later.
                    </p>
                    <Link
                        href="/dashboard/search"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                    >
                        <Search className="w-4 h-4" /> Search Jobs
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {sortedJobs.map((job, i) => (
                            <JobCard
                                key={job.apply_url || `saved-${i}`}
                                job={job}
                                profile={profile}
                                apiKeys={apiKeys}
                                onSave={toggleSaveJob}
                                isSaved={savedJobIds.has(job.apply_url)}
                                onApply={toggleAppliedJob}
                                isApplied={appliedJobIds.has(job.apply_url)}
                                onTokensUpdated={refreshTokens}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
