'use client';
import { Bookmark, Search, X, ExternalLink, ChevronDown, Star, Eye, Download, CheckCircle, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { exportJobsToCSV } from '@/lib/export-csv';
import { stripHtml } from '@/lib/strip-html';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useState } from 'react';

const AVATAR_COLORS = [
    'bg-teal-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-pink-500',
];

function DotIndicator({ filled, total = 5 }) {
    return (
        <div className="flex items-center gap-[3px]">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`w-[7px] h-[7px] rounded-full ${
                        i < filled ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                />
            ))}
        </div>
    );
}

export default function SavedJobsPage() {
    const { savedJobsData, savedJobIds, toggleSaveJob, toggleAppliedJob, appliedJobIds, profile, apiKeys, refreshTokens } = useApp();
    const [sortField, setSortField] = useState('score');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedJobs, setSelectedJobs] = useState(new Set());

    const sortedJobs = [...savedJobsData].sort((a, b) => {
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


    const getOverallDots = (job) => {
        const score = job.analysis?.fit_score || job.match_score || 0;
        if (score >= 85) return 5;
        if (score >= 70) return 4;
        if (score >= 55) return 3;
        if (score >= 35) return 2;
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

    return (
        <div className="max-w-[1100px] space-y-0">
            <div className="mb-6">
                <h1 className="font-headline text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Saved Jobs</h1>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{savedJobsData.length} job{savedJobsData.length !== 1 ? 's' : ''} bookmarked</p>
            </div>

            {sortedJobs.length === 0 ? (
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-16 text-center shadow-sm">
                    <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <Bookmark className="w-8 h-8 text-brand-400" />
                    </div>
                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 mb-2 font-headline">No Saved Jobs</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                        Save jobs you're interested in while searching. They'll appear here for easy access.
                    </p>
                    <Link
                        href="/dashboard/search"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-600/20 font-headline"
                    >
                        <Search className="w-4 h-4" /> Find Jobs
                    </Link>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[#2d3140]">
                        <div className="flex items-center gap-3">
                            <span className="text-[12px] text-slate-400 dark:text-slate-500 font-semibold font-headline">{sortedJobs.length} jobs</span>
                        </div>
                        <button
                            onClick={() => exportJobsToCSV(sortedJobs)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </div>

                    {/* Column headers */}
                    <div className="hidden md:grid grid-cols-[40px,1fr,140px,120px,100px,80px] items-center gap-0 px-5 py-2.5 bg-midas-surface-low/50 dark:bg-[#13151d]/80 border-b border-slate-100 dark:border-[#2d3140] text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] select-none font-headline">
                        <div className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={selectedJobs.size === sortedJobs.length && sortedJobs.length > 0}
                                onChange={toggleSelectAll}
                                className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                            />
                        </div>
                        <button onClick={() => toggleSort('company')} className="flex items-center gap-1 text-left cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            Job
                            {sortField === 'company' && <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />}
                        </button>
                        <button onClick={() => toggleSort('score')} className="flex items-center gap-1 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            Match
                            {sortField === 'score' && <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />}
                        </button>
                        <div>Source</div>
                        <div>Status</div>
                        <div className="text-right pr-1">Actions</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-50 dark:divide-[#22252f]">
                        {sortedJobs.map((job, i) => {
                            const jobId = job.apply_url || job.title;
                            const isSelected = selectedJobs.has(job.apply_url);
                            const score = job.analysis?.fit_score || job.match_score || 0;
                            const dots = getOverallDots(job);
                            const isApplied = appliedJobIds.has(job.apply_url);

                            return (
                                <div
                                    key={jobId + i}
                                    className={`flex flex-col gap-2 p-4 md:grid md:grid-cols-[40px,1fr,140px,120px,100px,80px] md:items-center md:gap-0 md:px-4 md:py-3 transition-colors duration-100 group ${
                                        isSelected ? 'bg-brand-50/40 dark:bg-brand-900/20' : 'hover:bg-gray-50/70 dark:hover:bg-[#22252f]/70'
                                    }`}
                                >
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(job.apply_url)}
                                            className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 min-w-0 pr-4">
                                        <CompanyLogo company={job.company} applyUrl={job.apply_url} size={36} colorIndex={i} />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                                    onClick={() => {
                                                        try {
                                                            const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                                            localStorage.setItem(key, JSON.stringify(job));
                                                        } catch (e) { /* ignore */ }
                                                    }}
                                                    className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-brand-600 transition-colors font-headline"
                                                >
                                                    {stripHtml(job.title)}
                                                </Link>
                                            </div>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-300 truncate mt-0.5">
                                                {stripHtml(job.company)}
                                                {job.location && <> · {stripHtml(job.location)}</>}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <DotIndicator filled={dots} />
                                        {score > 0 && (
                                            <span className="text-[11px] text-gray-300 dark:text-gray-300">{Math.round(score)}%</span>
                                        )}
                                    </div>

                                    <div>
                                        {job.source && (
                                            <span className="text-[11px] text-gray-400 dark:text-gray-300">{job.source}</span>
                                        )}
                                    </div>

                                    <div>
                                        {isApplied ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold bg-brand-50 text-brand-600 border border-brand-100">
                                                <CheckCircle className="w-2.5 h-2.5" />
                                                Applied
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold bg-sky-50 text-sky-600 border border-sky-100">
                                                <Bookmark className="w-2.5 h-2.5" />
                                                Saved
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                            onClick={() => {
                                                try {
                                                    const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                                    localStorage.setItem(key, JSON.stringify(job));
                                                } catch (e) { /* ignore */ }
                                            }}
                                            className="p-1.5 text-gray-300 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                                            title="View details"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Link>
                                        <button
                                            onClick={() => toggleSaveJob(job)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                            title="Unsave"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer / Bulk Actions Bar */}
                    <div className={`px-5 py-2.5 border-t border-gray-100 dark:border-[#2d3140] flex items-center justify-between transition-colors ${
                        selectedJobs.size > 0 ? 'bg-gray-900 dark:bg-[#13151d]' : 'bg-gray-50/50 dark:bg-[#13151d]/50'
                    }`}>
                        {selectedJobs.size > 0 ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] text-white font-medium">
                                        {selectedJobs.size} selected
                                    </span>
                                    <button
                                        onClick={() => setSelectedJobs(new Set())}
                                        className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer ml-1"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            const selected = sortedJobs.filter(j => selectedJobs.has(j.apply_url));
                                            selected.forEach(job => {
                                                if (!appliedJobIds.has(job.apply_url)) toggleAppliedJob(job);
                                            });
                                            setSelectedJobs(new Set());
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                                        title="Mark selected as applied"
                                    >
                                        <Check className="w-3 h-3" />
                                        Mark Applied
                                    </button>
                                    <button
                                        onClick={() => {
                                            const selected = sortedJobs.filter(j => selectedJobs.has(j.apply_url));
                                            exportJobsToCSV(selected);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                                        title="Export selected as CSV"
                                    >
                                        <Download className="w-3 h-3" />
                                        Export
                                    </button>
                                    <div className="w-px h-4 bg-white/20 mx-1" />
                                    <button
                                        onClick={() => {
                                            const selected = sortedJobs.filter(j => selectedJobs.has(j.apply_url));
                                            selected.forEach(job => toggleSaveJob(job));
                                            setSelectedJobs(new Set());
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                                        title="Unsave selected"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Unsave
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-[11px] text-gray-400 dark:text-gray-300">
                                Showing {sortedJobs.length} job{sortedJobs.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
