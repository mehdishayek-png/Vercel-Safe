'use client';
import { Briefcase, Search, ExternalLink, Clock, X, CheckCircle, RefreshCw, Star, ChevronDown, MapPin, Building2, MoreHorizontal, Download, Filter, Eye, Trash2, Bookmark, FileText } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { exportJobsToCSV } from '@/lib/export-csv';
import { useState, useRef, useEffect } from 'react';

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

function multiplierToDots(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return 3;
    if (num >= 1.1) return 5;
    if (num >= 1.0) return 4;
    if (num >= 0.8) return 3;
    if (num >= 0.5) return 2;
    return 1;
}

function ScorePopover({ job, onClose }) {
    const ref = useRef(null);
    const score = job.analysis?.fit_score || job.match_score || 0;
    const multipliers = job.heuristic_breakdown?.multipliers || {};
    const matches = job.heuristic_breakdown?.matches || [];
    const skillCount = matches.length;
    const experienceYears = job.heuristic_breakdown?.experience_years || null;

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    const sections = [
        { label: 'Skill Relevance', key: 'semantic', fallback: 'depth', detail: skillCount > 0 ? matches.slice(0, 4).map(m => m.skill).join(', ') : 'No direct overlaps' },
        { label: 'Title Relevance', key: 'coherence', fallback: 'roleFamily', detail: job.title?.replace(/<[^>]*>/g, '') },
        { label: 'Experience Relevance', key: 'seniority', detail: experienceYears ? `${experienceYears} yrs experience` : 'N/A' },
        { label: 'Location Match', key: 'location', detail: job.location?.replace(/<[^>]*>/g, '') || 'Remote' },
        { label: 'Career Track', key: 'roleFamily', detail: multipliers.roleFamily >= 1.0 ? 'Aligned' : multipliers.roleFamily >= 0.6 ? 'Adjacent field' : 'Different track' },
    ];

    return (
        <div ref={ref} className="absolute right-0 top-full mt-2 z-50 w-[320px] bg-white rounded-xl shadow-xl border border-gray-200 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Top stats */}
            <div className="flex items-baseline gap-6 mb-5 pb-4 border-b border-gray-100">
                <div className="text-center">
                    <div className="text-[22px] font-light text-gray-800">{experienceYears || '--'}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Relevant Experience</div>
                </div>
                <div className="text-center">
                    <div className="text-[22px] font-light text-gray-800">{skillCount}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Relevant Skills</div>
                </div>
                <div className="text-center">
                    <div className="text-[22px] font-light text-gray-800">{score}%</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Match Score</div>
                </div>
            </div>

            {/* Relevance rows */}
            <div className="space-y-3.5">
                {sections.map((section) => {
                    const val = multipliers[section.key] ?? multipliers[section.fallback] ?? 0.8;
                    const dots = multiplierToDots(val);
                    return (
                        <div key={section.label}>
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[13px] font-medium text-gray-700">{section.label}</span>
                                <DotIndicator filled={dots} />
                            </div>
                            <p className="text-[11px] text-gray-400 leading-snug">{section.detail}</p>
                        </div>
                    );
                })}
            </div>

            {/* View full details */}
            <Link
                href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                onClick={() => {
                    try {
                        const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                        localStorage.setItem(key, JSON.stringify(job));
                    } catch (e) { /* ignore */ }
                }}
                className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-gray-100 text-[13px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
                View Full Analysis
            </Link>
        </div>
    );
}

const AVATAR_COLORS = [
    'bg-teal-500',
    'bg-sky-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-emerald-500',
    'bg-indigo-500',
    'bg-pink-500',
];

export default function ApplicationsPage() {
    const { appliedJobsData, appliedJobIds, toggleAppliedJob, toggleSaveJob, savedJobIds } = useApp();
    const [filter, setFilter] = useState('all');
    const [activePopover, setActivePopover] = useState(null);
    const [selectedJobs, setSelectedJobs] = useState(new Set());
    const [sortField, setSortField] = useState('date');
    const [sortDir, setSortDir] = useState('desc');

    const sortedApps = [...appliedJobsData].sort((a, b) => {
        if (sortField === 'date') {
            const dateA = new Date(a.applied_at || 0).getTime();
            const dateB = new Date(b.applied_at || 0).getTime();
            return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
        }
        if (sortField === 'score') {
            const scoreA = a.analysis?.fit_score || a.match_score || 0;
            const scoreB = b.analysis?.fit_score || b.match_score || 0;
            return sortDir === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        }
        if (sortField === 'company') {
            return sortDir === 'desc'
                ? (b.company || '').localeCompare(a.company || '')
                : (a.company || '').localeCompare(b.company || '');
        }
        return 0;
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getRelativeDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return '';
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
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
        if (selectedJobs.size === sortedApps.length) {
            setSelectedJobs(new Set());
        } else {
            setSelectedJobs(new Set(sortedApps.map(j => j.apply_url)));
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

    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '');
    };

    const tabs = [
        { id: 'all', label: 'All Applications', count: appliedJobsData.length },
        { id: 'recent', label: 'This Week', count: appliedJobsData.filter(j => {
            const d = new Date(j.applied_at || 0);
            const now = new Date();
            return (now - d) / (1000 * 60 * 60 * 24) <= 7;
        }).length },
        { id: 'high-match', label: 'High Match', count: appliedJobsData.filter(j => (j.analysis?.fit_score || j.match_score || 0) >= 70).length },
    ];

    const filteredApps = sortedApps.filter(job => {
        if (filter === 'recent') {
            const d = new Date(job.applied_at || 0);
            return (new Date() - d) / (1000 * 60 * 60 * 24) <= 7;
        }
        if (filter === 'high-match') {
            return (job.analysis?.fit_score || job.match_score || 0) >= 70;
        }
        return true;
    });

    return (
        <div className="max-w-[1100px] space-y-0">
            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Applications</h1>
                <p className="text-sm text-gray-400 mt-1">Track and manage your job applications</p>
            </div>

            {filteredApps.length === 0 && filter === 'all' ? (
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <Briefcase className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
                    <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                        Start by searching for jobs and marking them as applied. Your application history will appear here for easy tracking.
                    </p>
                    <Link
                        href="/dashboard/search"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        <Search className="w-4 h-4" /> Find Jobs
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex items-center justify-between border-b border-gray-200">
                        <div className="flex">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id)}
                                    className={`relative px-5 py-3.5 text-[13px] font-medium transition-colors cursor-pointer ${
                                        filter === tab.id
                                            ? 'text-gray-900'
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className={`ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                                            filter === tab.id ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                    {filter === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 pr-4">
                            <button
                                onClick={() => exportJobsToCSV(sortedApps)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-[40px,1fr,180px,120px,100px,80px] items-center gap-0 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 text-[11px] font-medium text-gray-400 uppercase tracking-wider select-none">
                        <div className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={selectedJobs.size === filteredApps.length && filteredApps.length > 0}
                                onChange={toggleSelectAll}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-teal-500 focus:ring-teal-500 cursor-pointer"
                            />
                        </div>
                        <button onClick={() => toggleSort('company')} className="flex items-center gap-1 text-left cursor-pointer hover:text-gray-600 transition-colors">
                            Job
                            {sortField === 'company' && <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />}
                        </button>
                        <button onClick={() => toggleSort('score')} className="flex items-center gap-1 cursor-pointer hover:text-gray-600 transition-colors">
                            Match
                            {sortField === 'score' && <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />}
                        </button>
                        <div>Status</div>
                        <button onClick={() => toggleSort('date')} className="flex items-center gap-1 cursor-pointer hover:text-gray-600 transition-colors">
                            Applied
                            {sortField === 'date' && <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />}
                        </button>
                        <div className="text-right pr-1">Actions</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-50">
                        {filteredApps.map((job, i) => {
                            const jobId = job.apply_url || job.title;
                            const isSelected = selectedJobs.has(job.apply_url);
                            const score = job.analysis?.fit_score || job.match_score || 0;
                            const dots = getOverallDots(job);
                            const colorIndex = i % AVATAR_COLORS.length;
                            const initial = (stripHtml(job.company) || '?').charAt(0).toUpperCase();
                            const secondInitial = (stripHtml(job.company) || '??').split(/\s/).filter(Boolean)[1]?.charAt(0)?.toUpperCase() || '';

                            return (
                                <div
                                    key={jobId + i}
                                    className={`grid grid-cols-[40px,1fr,180px,120px,100px,80px] items-center gap-0 px-4 py-3 transition-colors duration-100 group ${
                                        isSelected ? 'bg-teal-50/40' : 'hover:bg-gray-50/70'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(job.apply_url)}
                                            className="w-3.5 h-3.5 rounded border-gray-300 text-teal-500 focus:ring-teal-500 cursor-pointer"
                                        />
                                    </div>

                                    {/* Job info with avatar */}
                                    <div className="flex items-center gap-3 min-w-0 pr-4">
                                        <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[colorIndex]} flex items-center justify-center text-white text-[12px] font-semibold tracking-tight shrink-0`}>
                                            {initial}{secondInitial}
                                        </div>
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
                                                    className="text-[13px] font-medium text-gray-900 truncate hover:text-teal-600 transition-colors"
                                                >
                                                    {stripHtml(job.title)}
                                                </Link>
                                                <Star className="w-3 h-3 text-gray-300 hover:text-amber-400 cursor-pointer transition-colors shrink-0 opacity-0 group-hover:opacity-100" />
                                            </div>
                                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                                {stripHtml(job.company)}
                                                {job.location && <> · {stripHtml(job.location)}</>}
                                                {job.source && <> · <span className="text-gray-300">{job.source}</span></>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Match dots */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActivePopover(activePopover === jobId ? null : jobId);
                                            }}
                                            className="flex items-center gap-2.5 cursor-pointer group/dots"
                                        >
                                            <DotIndicator filled={dots} />
                                            {score > 0 && (
                                                <span className="text-[11px] text-gray-300 group-hover/dots:text-teal-500 transition-colors">
                                                    {score}%
                                                </span>
                                            )}
                                        </button>
                                        {activePopover === jobId && (
                                            <ScorePopover
                                                job={job}
                                                onClose={() => setActivePopover(null)}
                                            />
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold bg-teal-50 text-teal-600 border border-teal-100">
                                            <CheckCircle className="w-2.5 h-2.5" />
                                            Applied
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <div className="text-[12px] text-gray-400">
                                        <div>{formatDate(job.applied_at)}</div>
                                        {getRelativeDate(job.applied_at) && (
                                            <div className="text-[10px] text-gray-300">{getRelativeDate(job.applied_at)}</div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                                            onClick={() => {
                                                try {
                                                    const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                                    localStorage.setItem(key, JSON.stringify(job));
                                                } catch (e) { /* ignore */ }
                                            }}
                                            className="p-1.5 text-gray-300 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                            title="View details"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Link>
                                        {job.apply_url && (
                                            <a
                                                href={job.apply_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-gray-300 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                                title="Open original listing"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => toggleAppliedJob(job)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                            title="Remove"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer / Bulk Actions Bar */}
                    <div className={`px-5 py-2.5 border-t border-gray-100 flex items-center justify-between transition-colors ${
                        selectedJobs.size > 0 ? 'bg-gray-900' : 'bg-gray-50/50'
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
                                            const selectedJobsList = filteredApps.filter(j => selectedJobs.has(j.apply_url));
                                            selectedJobsList.forEach(job => {
                                                if (!savedJobIds.has(job.apply_url)) toggleSaveJob(job);
                                            });
                                            setSelectedJobs(new Set());
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                                        title="Save selected jobs"
                                    >
                                        <Bookmark className="w-3 h-3" />
                                        Save All
                                    </button>
                                    <button
                                        onClick={() => {
                                            const selectedJobsList = filteredApps.filter(j => selectedJobs.has(j.apply_url));
                                            exportJobsToCSV(selectedJobsList);
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
                                            const selectedJobsList = filteredApps.filter(j => selectedJobs.has(j.apply_url));
                                            selectedJobsList.forEach(job => toggleAppliedJob(job));
                                            setSelectedJobs(new Set());
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                                        title="Remove selected from applications"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Remove
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[11px] text-gray-400">
                                    Showing {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''}
                                </p>
                                <p className="text-[11px] text-gray-300">
                                    Click the dots to see match breakdown
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Follow-up reminder */}
            {appliedJobsData.length > 0 && (
                <div className="mt-5 bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                        <RefreshCw className="w-3.5 h-3.5 text-teal-500" />
                    </div>
                    <div>
                        <p className="text-[13px] font-medium text-gray-700">Follow-up reminder</p>
                        <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">
                            Check back every 2–3 days to follow up on applications. Companies typically respond within 1–2 weeks.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
