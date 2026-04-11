'use client';
import { Bookmark, Search, X, ExternalLink, ChevronDown, Star, Eye, Download, CheckCircle, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { useProfileStore } from '@/stores/profile-store';
import { useJobsStore } from '@/stores/jobs-store';
import { useTokenStore } from '@/stores/token-store';
import { exportJobsToCSV } from '@/lib/export-csv';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useState } from 'react';
import { safeBtoa } from '@/lib/safe-btoa';

const AVATAR_COLORS = [
    'bg-teal-500', 'bg-sky-500', 'bg-accent-500', 'bg-amber-500',
    'bg-rose-500', 'bg-emerald-500', 'bg-brand-500', 'bg-pink-500',
];

function DotIndicator({ filled, total = 5 }) {
    return (
        <div className="flex items-center gap-[3px]">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`w-[7px] h-[7px] rounded-full ${
                        i < filled ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );
}

export default function SavedJobsPage() {
    const { profile, apiKeys } = useProfileStore();
    const { savedJobsData, savedJobIds, toggleSaveJob, toggleAppliedJob, appliedJobIds } = useJobsStore();
    const refreshTokens = useTokenStore(s => s.refreshTokens);
    const [sortField, setSortField] = useState('score');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedJobs, setSelectedJobs] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const filteredJobs = savedJobsData.filter(job => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (job.title || '').toLowerCase().includes(q) ||
            (job.company || '').toLowerCase().includes(q) ||
            (job.location || '').toLowerCase().includes(q)
        );
    });

    const sortedJobs = [...filteredJobs].sort((a, b) => {
        if (sortField === 'date') {
            const dateA = new Date(a.date_posted || a.posted_date || 0).getTime();
            const dateB = new Date(b.date_posted || b.posted_date || 0).getTime();
            return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
        }
        if (sortField === 'company') {
            return sortDir === 'desc'
                ? (b.company || '').localeCompare(a.company || '')
                : (a.company || '').localeCompare(b.company || '');
        }
        // Default: score
        const scoreA = a.analysis?.fit_score || a.match_score || 0;
        const scoreB = b.analysis?.fit_score || b.match_score || 0;
        return sortDir === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '');
    };

    const getOverallDots = (job) => {
        const score = job.analysis?.fit_score || job.match_score || 0;
        if (score >= 85) return 5;
        if (score >= 70) return 4;
        if (score >= 55) return 3;
        if (score >= 25) return 2;
        return 1;
    };

    const toggleSelect = (id) => {
        setSelectedJobs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedJobs.size === sortedJobs.length) {
            setSelectedJobs(new Set());
        } else {
            setSelectedJobs(new Set(sortedJobs.map(j => j.apply_url)));
        }
    };

    // Stats
    const totalSaved = savedJobsData.length;
    const totalApplied = savedJobsData.filter(j => appliedJobIds.has(j.apply_url)).length;
    const scores = savedJobsData.map(j => j.analysis?.fit_score || j.match_score || 0).filter(s => s > 0);
    const avgMatch = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const getScoreColor = (score) => {
        if (score >= 85) return 'text-emerald-600';
        if (score >= 70) return 'text-blue-600';
        return 'text-amber-600';
    };

    const getScoreBg = (score) => {
        if (score >= 85) return 'bg-emerald-50 ring-emerald-200';
        if (score >= 70) return 'bg-blue-50 ring-blue-200';
        return 'bg-amber-50 ring-amber-200';
    };

    return (
        <div className="max-w-[1200px] space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-[2rem] font-headline font-black text-gray-900 tracking-tight">Saved Jobs</h1>
                <p className="text-sm text-gray-400 mt-1">Your bookmarked opportunities</p>
            </div>

            {/* Glass Stats Bar */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-xl rounded-2xl border border-transparent shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Bookmark className="w-4 h-4 text-teal-500" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-900 leading-none">{totalSaved}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Saved</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-xl rounded-2xl border border-transparent shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-900 leading-none">{totalApplied}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Applied</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-xl rounded-2xl border border-transparent shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-accent-50 flex items-center justify-center">
                        <Star className="w-4 h-4 text-accent-500" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-900 leading-none">{avgMatch}%</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Avg Match</p>
                    </div>
                </div>
            </div>

            {sortedJobs.length === 0 && savedJobsData.length === 0 ? (
                /* Empty State */
                <div className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-sky-50 rounded-2xl border border-transparent shadow-card p-16 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-sky-500/5" />
                    <div className="relative">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-transparent">
                            <Bookmark className="w-10 h-10 text-teal-400" />
                        </div>
                        <h3 className="text-xl font-headline font-semibold text-gray-900 mb-2">No Saved Jobs Yet</h3>
                        <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                            Save jobs you're interested in while searching. They'll appear here for easy access and tracking.
                        </p>
                        <Link
                            href="/dashboard/search"
                            className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl text-sm font-semibold hover:from-teal-500 hover:to-teal-400 transition-all shadow-lg shadow-teal-500/20"
                        >
                            <Search className="w-4 h-4" /> Find Jobs
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* Sort / Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    type="text"
                                    placeholder="Search saved jobs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 w-64 bg-white/80 backdrop-blur-xl border border-transparent rounded-xl text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Sort pills */}
                            <span className="text-[11px] text-gray-400 font-medium mr-1">Sort:</span>
                            {[
                                { key: 'score', label: 'Match' },
                                { key: 'company', label: 'Company' },
                                { key: 'date', label: 'Date' },
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => toggleSort(opt.key)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all cursor-pointer ${
                                        sortField === opt.key
                                            ? 'bg-gray-900 text-white shadow-sm'
                                            : 'bg-white/80 backdrop-blur-xl text-gray-500 border border-transparent hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                    {sortField === opt.key && (
                                        <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
                                    )}
                                </button>
                            ))}
                            <div className="w-px h-5 bg-gray-200 mx-1" />
                            <button
                                onClick={() => exportJobsToCSV(sortedJobs)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-400 hover:text-gray-600 bg-white/80 backdrop-blur-xl border border-transparent hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export
                            </button>
                            {/* Select all */}
                            <button
                                onClick={toggleSelectAll}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-xl transition-colors cursor-pointer ${
                                    selectedJobs.size === sortedJobs.length && sortedJobs.length > 0
                                        ? 'bg-teal-50 text-teal-600 border border-teal-200'
                                        : 'text-gray-400 bg-white/80 backdrop-blur-xl border border-transparent hover:bg-gray-50'
                                }`}
                            >
                                <Check className="w-3.5 h-3.5" />
                                {selectedJobs.size === sortedJobs.length && sortedJobs.length > 0 ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                    </div>

                    {/* No search results */}
                    {sortedJobs.length === 0 && searchQuery.trim() && (
                        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-transparent shadow-card p-12 text-center">
                            <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No jobs match "{searchQuery}"</p>
                        </div>
                    )}

                    {/* Card Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sortedJobs.map((job, i) => {
                            const jobId = job.apply_url || job.title;
                            const isSelected = selectedJobs.has(job.apply_url);
                            const score = job.analysis?.fit_score || job.match_score || 0;
                            const dots = getOverallDots(job);
                            const isApplied = appliedJobIds.has(job.apply_url);

                            return (
                                <div
                                    key={jobId + i}
                                    className={`relative bg-white/80 backdrop-blur-xl rounded-2xl border transition-all duration-200 group hover:shadow-lg hover:-translate-y-0.5 ${
                                        isSelected
                                            ? 'border-teal-300 ring-2 ring-teal-500/20 shadow-md'
                                            : 'border-transparent shadow-card hover:border-surface-300'
                                    }`}
                                >
                                    {/* Selection checkbox */}
                                    <div className="absolute top-3 right-3 z-10">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(job.apply_url)}
                                            className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-teal-500"
                                        />
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-5">
                                        {/* Top section: Logo + Info + Score */}
                                        <div className="flex items-start gap-3.5">
                                            <CompanyLogo company={job.company} applyUrl={job.apply_url} size={44} colorIndex={i} />
                                            <div className="flex-1 min-w-0 pr-6">
                                                <Link
                                                    href={`/dashboard/job/${encodeURIComponent(safeBtoa(job.apply_url || job.title))}`}
                                                    onClick={() => {
                                                        try {
                                                            const key = `job_detail_${safeBtoa(job.apply_url || job.title)}`;
                                                            localStorage.setItem(key, JSON.stringify(job));
                                                        } catch (e) { /* ignore */ }
                                                    }}
                                                    className="text-[15px] font-semibold text-gray-900 hover:text-teal-600 transition-colors line-clamp-2 leading-snug"
                                                >
                                                    {stripHtml(job.title)}
                                                </Link>
                                                <p className="text-[13px] text-gray-500 font-medium mt-0.5">
                                                    {stripHtml(job.company)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Match score badge */}
                                        {score > 0 && (
                                            <div className="mt-4 flex items-center gap-3">
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ring-1 ${getScoreBg(score)}`}>
                                                    <span className={`text-lg font-bold leading-none ${getScoreColor(score)}`}>
                                                        {Math.round(score)}%
                                                    </span>
                                                    <span className={`text-[10px] font-medium uppercase tracking-wider ${getScoreColor(score)} opacity-70`}>
                                                        match
                                                    </span>
                                                </div>
                                                <DotIndicator filled={dots} />
                                            </div>
                                        )}

                                        {/* Meta labels */}
                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            {job.location && (
                                                <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                                    {stripHtml(job.location)}
                                                </span>
                                            )}
                                            {job.source && (
                                                <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                                    {job.source}
                                                </span>
                                            )}
                                            {isApplied ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 text-teal-600 border border-teal-100">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Applied
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-50 text-sky-600 border border-sky-100">
                                                    <Bookmark className="w-3 h-3" />
                                                    Saved
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Footer: Actions */}
                                    <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100/80 bg-gray-50/40 rounded-b-2xl">
                                        <Link
                                            href={`/dashboard/job/${encodeURIComponent(safeBtoa(job.apply_url || job.title))}`}
                                            onClick={() => {
                                                try {
                                                    const key = `job_detail_${safeBtoa(job.apply_url || job.title)}`;
                                                    localStorage.setItem(key, JSON.stringify(job));
                                                } catch (e) { /* ignore */ }
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View
                                        </Link>
                                        <div className="flex items-center gap-1">
                                            {isApplied ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-teal-500">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Applied
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => toggleAppliedJob(job)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Apply
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleSaveJob(job)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Floating Bulk Actions Bar */}
            {selectedJobs.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-gray-900 rounded-2xl shadow-2xl border border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] text-white font-medium">
                            {selectedJobs.size} selected
                        </span>
                        <button
                            onClick={() => setSelectedJobs(new Set())}
                            className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer ml-1 underline underline-offset-2"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="w-px h-5 bg-white/20" />
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                const selected = sortedJobs.filter(j => selectedJobs.has(j.apply_url));
                                selected.forEach(job => {
                                    if (!appliedJobIds.has(job.apply_url)) toggleAppliedJob(job);
                                });
                                setSelectedJobs(new Set());
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                            title="Mark selected as applied"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Mark Applied
                        </button>
                        <button
                            onClick={() => {
                                const selected = sortedJobs.filter(j => selectedJobs.has(j.apply_url));
                                exportJobsToCSV(selected);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                            title="Export selected as CSV"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <button
                            onClick={() => {
                                const selected = sortedJobs.filter(j => selectedJobs.has(j.apply_url));
                                selected.forEach(job => toggleSaveJob(job));
                                setSelectedJobs(new Set());
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                            title="Unsave selected"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Unsave
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
