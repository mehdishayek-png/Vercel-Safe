'use client';
import { Briefcase, Search, ExternalLink, Clock, X, CheckCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { exportJobsToCSV } from '@/lib/export-csv';
import { useState } from 'react';

export default function ApplicationsPage() {
    const { appliedJobsData, appliedJobIds, toggleAppliedJob } = useApp();
    const [filter, setFilter] = useState('all');

    const sortedApps = [...appliedJobsData].sort((a, b) => {
        const dateA = new Date(a.applied_at || 0).getTime();
        const dateB = new Date(b.applied_at || 0).getTime();
        return dateB - dateA;
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Job Applications</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {appliedJobsData.length} application{appliedJobsData.length !== 1 ? 's' : ''} tracked
                    </p>
                </div>
                {appliedJobsData.length > 0 && (
                    <button
                        onClick={() => exportJobsToCSV(sortedApps)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                    >
                        Export CSV
                    </button>
                )}
            </div>

            {sortedApps.length === 0 ? (
                <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
                    <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                        When you apply for a job, mark it as "Applied" to track it here. We'll help you stay organized.
                    </p>
                    <Link
                        href="/dashboard/search"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                    >
                        <Search className="w-4 h-4" /> Search Jobs
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr,180px,120px,140px,80px] gap-4 px-5 py-3 bg-surface-50 border-b border-surface-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        <span>Job</span>
                        <span>Company</span>
                        <span>Applied</span>
                        <span>Score</span>
                        <span className="text-right">Action</span>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-surface-100">
                        {sortedApps.map((job, i) => (
                            <div key={job.apply_url || i} className="grid grid-cols-[1fr,180px,120px,140px,80px] gap-4 px-5 py-3.5 items-center hover:bg-brand-50/30 transition-all duration-150 group border-l-2 border-transparent hover:border-brand-400">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{job.location || 'Remote'}</p>
                                </div>

                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                                        ['bg-brand-500', 'bg-accent-500', 'bg-emerald-500', 'bg-amber-500'][i % 4]
                                    }`}>
                                        {(job.company || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm text-gray-700 truncate">{job.company || 'Unknown'}</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(job.applied_at)}
                                </div>

                                <div className="flex items-center gap-2">
                                    {(job.match_score || job.analysis?.fit_score) ? (
                                        <span className={`text-sm font-semibold ${
                                            (job.analysis?.fit_score || job.match_score) >= 70 ? 'text-emerald-600' :
                                            (job.analysis?.fit_score || job.match_score) >= 50 ? 'text-amber-600' : 'text-gray-500'
                                        }`}>
                                            {job.analysis?.fit_score || job.match_score}%
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">&mdash;</span>
                                    )}
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                        <CheckCircle className="w-3 h-3" />
                                        Applied
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 justify-end">
                                    {job.apply_url && (
                                        <a
                                            href={job.apply_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="View job"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => toggleAppliedJob(job)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                        title="Remove from applications"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tips */}
            {appliedJobsData.length > 0 && (
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start gap-3">
                    <RefreshCw className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-brand-900">Track your progress</p>
                        <p className="text-xs text-brand-600 mt-0.5">
                            Check back every 2-3 days to follow up on your applications. Companies typically respond within 1-2 weeks.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
