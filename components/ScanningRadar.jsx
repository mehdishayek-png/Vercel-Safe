import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Building2, Clock3, Layers3, Radio, Sparkles } from 'lucide-react';

const MAX_VISIBLE_SOURCES = 4;
const MAX_VISIBLE_MATCHES = 3;

function getScore(job) {
    return Math.round(job.analysis?.fit_score || job.match_score || 0);
}

function normalizeCompany(company = '') {
    return company
        .replace(/\b(inc|llc|ltd|corp|corporation|company)\b\.?/gi, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
}

function formatTime(seconds) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ScanningRadar({ jobs = [], activity }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setElapsed((previous) => previous + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const scanSummary = useMemo(() => {
        const companies = new Set();
        const sources = new Set();

        for (const job of jobs) {
            companies.add(normalizeCompany(job.company || 'Unknown'));
            if (job.source) sources.add(job.source);
        }

        const strongestMatches = [...jobs]
            .sort((a, b) => getScore(b) - getScore(a))
            .slice(0, MAX_VISIBLE_MATCHES);

        return {
            companyCount: companies.size,
            sources: Array.from(sources),
            strongestMatches,
        };
    }, [jobs]);

    const visibleSources = scanSummary.sources.slice(0, MAX_VISIBLE_SOURCES);
    const additionalSources = Math.max(0, scanSummary.sources.length - visibleSources.length);
    const statusMessage = activity || (jobs.length > 0
        ? 'Ranking new matches as each source responds.'
        : 'Connecting to the best sources for this search.');

    return (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-900/10 bg-slate-950 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.8)]">
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative grid gap-0 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
                <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                                </span>
                                Live market scan
                            </div>
                            <h2 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">
                                {jobs.length > 0 ? `${jobs.length} matches surfaced` : 'Searching across the market'}
                            </h2>
                            <p className="mt-1 max-w-xl truncate text-xs text-slate-400 sm:text-sm" title={statusMessage}>
                                {statusMessage}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono text-xs text-slate-300">
                            <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                            {formatTime(elapsed)}
                        </div>
                    </div>

                    <div className="relative my-5 h-8 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.035]">
                        <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        {[12, 32, 55, 76, 91].map((position, index) => (
                            <motion.span
                                key={position}
                                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand-300"
                                style={{ left: `${position}%` }}
                                animate={{ opacity: [0.2, 1, 0.2], scale: [0.75, 1.35, 0.75] }}
                                transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.28 }}
                            />
                        ))}
                        <motion.div
                            className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-brand-300/25 to-transparent"
                            animate={{ x: ['-100%', '620%'] }}
                            transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                        />
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/[0.07] bg-white/[0.04]">
                        <ScanMetric icon={Activity} value={jobs.length} label="Matches" />
                        <ScanMetric icon={Building2} value={scanSummary.companyCount} label="Companies" />
                        <ScanMetric icon={Layers3} value={scanSummary.sources.length} label="Sources live" />
                    </div>

                    {visibleSources.length > 0 && (
                        <div className="mt-4 flex min-w-0 items-center gap-2">
                            <Radio className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            <div className="flex min-w-0 flex-wrap gap-1.5">
                                {visibleSources.map((source) => (
                                    <span key={source} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-400">
                                        {source}
                                    </span>
                                ))}
                                {additionalSources > 0 && (
                                    <span className="px-1 py-1 text-[10px] font-semibold text-slate-500">+{additionalSources} more</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-white/10 bg-white/[0.035] p-5 sm:p-6 md:border-l md:border-t-0">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Best incoming</div>
                            <div className="mt-1 text-sm font-semibold text-slate-200">Ranked while the scan continues</div>
                        </div>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                    </div>

                    {scanSummary.strongestMatches.length > 0 ? (
                        <div className="space-y-2">
                            {scanSummary.strongestMatches.map((job, index) => (
                                <motion.div
                                    key={job.id || job.apply_url || `${job.company}-${job.title}`}
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-slate-900/60 px-3 py-2.5"
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-[10px] font-bold text-slate-400">
                                        {String(index + 1).padStart(2, '0')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-xs font-semibold text-white">{job.title || 'Untitled role'}</div>
                                        <div className="mt-0.5 truncate text-[10px] text-slate-500">{job.company || 'Company unavailable'}</div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <div className="text-sm font-bold text-amber-300">{getScore(job)}</div>
                                        <div className="text-[8px] font-bold uppercase tracking-wider text-slate-600">score</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-6 text-center">
                            <Radio className="mb-3 h-5 w-5 text-brand-300" />
                            <p className="text-xs font-medium text-slate-300">Waiting for the first source</p>
                            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Strong matches will appear here as soon as they are verified.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function ScanMetric({ icon: Icon, value, label }) {
    return (
        <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 sm:px-4">
            <Icon className="hidden h-4 w-4 shrink-0 text-slate-500 sm:block" />
            <div className="min-w-0">
                <div className="font-headline text-lg font-bold leading-none text-white">{value}</div>
                <div className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
            </div>
        </div>
    );
}
