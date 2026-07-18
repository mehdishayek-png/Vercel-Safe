'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Database, Gauge, RefreshCw, SearchX } from 'lucide-react';

const WINDOWS = [
    { label: '24 hours', hours: 24 },
    { label: '7 days', hours: 168 },
    { label: '30 days', hours: 720 },
];

function value(input) {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatDuration(ms) {
    if (!ms) return '0s';
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function SearchTelemetryPage() {
    const [hours, setHours] = useState(24);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/admin/search-telemetry?hours=${hours}`, { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Telemetry could not be loaded');
            setData(payload);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [hours]);

    useEffect(() => { load(); }, [load]);

    if (error) {
        return (
            <div className="mm-panel mx-auto max-w-3xl p-8">
                <AlertTriangle className="h-7 w-7 text-amber-600" />
                <h1 className="mt-4 font-headline text-2xl font-extrabold text-slate-950">Search telemetry unavailable</h1>
                <p className="mt-2 text-sm text-slate-600">{error}</p>
            </div>
        );
    }

    const overview = data?.overview || {};
    const cards = [
        { label: 'Search runs', value: value(overview.runs), icon: Activity },
        { label: 'Jobs scored', value: value(overview.scored_jobs), icon: Database },
        { label: 'Jobs displayed', value: value(overview.displayed_jobs), icon: Gauge },
        { label: 'Jobs discarded', value: value(overview.discarded_jobs), icon: SearchX },
    ];

    return (
        <div className="mx-auto max-w-[1280px] space-y-6">
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <span className="mm-kicker">Operations</span>
                    <h1 className="mt-3 font-headline text-3xl font-extrabold tracking-[-0.03em] text-slate-950">Search telemetry</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600">Source reliability, ranking decisions, and user outcomes. Use this evidence to tune retrieval and scoring without guessing.</p>
                </div>
                <div className="flex items-center gap-2">
                    {WINDOWS.map((item) => (
                        <button key={item.hours} onClick={() => setHours(item.hours)} className={`rounded-lg px-3 py-2 text-xs font-bold ${hours === item.hours ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-900/10'}`}>{item.label}</button>
                    ))}
                    <button onClick={load} aria-label="Refresh telemetry" className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-900/10"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
                </div>
            </header>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(({ label, value: cardValue, icon: Icon }) => (
                    <article key={label} className="mm-panel p-5">
                        <Icon className="h-4 w-4 text-brand-600" />
                        <p className="mt-5 font-mono text-2xl font-semibold text-slate-950">{cardValue.toLocaleString()}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
                    </article>
                ))}
            </section>

            <section className="mm-panel overflow-hidden">
                <div className="border-b border-slate-900/10 px-5 py-4">
                    <h2 className="font-headline text-lg font-extrabold text-slate-950">Source performance</h2>
                    <p className="mt-1 text-xs text-slate-500">Average completed scan: {formatDuration(value(overview.avg_duration_ms))}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-xs">
                        <thead className="bg-surface-50 font-mono uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Source</th><th>Success</th><th>P95</th><th>Unique</th><th>Enriched</th><th>Displayed</th><th>Yield</th><th>Clicks</th><th>Saves</th><th>Applies</th><th>Dismissed</th></tr></thead>
                        <tbody className="divide-y divide-slate-900/5">
                            {(data?.sources || []).map((source) => (
                                <tr key={source.source_name} className="text-slate-600">
                                    <td className="px-5 py-3 font-bold text-slate-900">{source.source_name}</td>
                                    <td>{source.success_rate || 0}%</td><td>{formatDuration(value(source.p95_latency_ms))}</td>
                                    <td>{value(source.unique_jobs)}</td><td>{value(source.enriched_jobs)}</td>
                                    <td>{value(source.displayed_jobs)}</td><td>{source.display_yield || 0}%</td>
                                    <td>{value(source.clicks)}</td><td>{value(source.saves)}</td><td>{value(source.applications)}</td><td>{value(source.dismissals)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <section className="mm-panel p-5">
                    <h2 className="font-headline text-lg font-extrabold text-slate-950">Discard reasons</h2>
                    <div className="mt-4 space-y-2">
                        {(data?.killers || []).slice(0, 15).map((item) => (
                            <div key={item.killer || 'unknown'} className="flex items-center justify-between rounded-xl bg-surface-50 px-3 py-2.5 text-xs">
                                <span className="font-mono text-slate-600">{item.killer || 'unknown'}</span>
                                <span className="font-bold text-slate-950">{item.jobs}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mm-panel overflow-hidden">
                    <div className="border-b border-slate-900/10 px-5 py-4">
                        <h2 className="font-headline text-lg font-extrabold text-slate-950">False-negative review queue</h2>
                        <p className="mt-1 text-xs text-slate-500">Highest-scoring jobs that did not cross their display threshold.</p>
                    </div>
                    <div className="max-h-[560px] divide-y divide-slate-900/5 overflow-y-auto">
                        {(data?.reviewQueue || []).slice(0, 50).map((job) => (
                            <article key={`${job.run_id}:${job.job_key}`} className="flex items-start gap-4 px-5 py-4">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 font-mono text-xs font-bold text-white">{Math.round(value(job.score))}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-950">{job.title}</p>
                                    <p className="mt-0.5 truncate text-xs text-slate-500">{job.company} · {job.source_name}</p>
                                    <p className="mt-2 font-mono text-[10px] text-amber-700">{job.killer || 'low_raw'} · threshold {job.display_threshold}</p>
                                </div>
                                {job.apply_url && <a href={job.apply_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-700">Inspect</a>}
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
