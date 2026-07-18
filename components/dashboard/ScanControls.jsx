import { Info, Loader2, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';

function Tooltip({ text }) {
    return (
        <span className="group relative inline-flex">
            <button type="button" aria-label={text} className="text-slate-400 hover:text-slate-600">
                <Info className="h-3 w-3" />
            </button>
            <span aria-hidden="true" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-center text-[10px] font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {text}
            </span>
        </span>
    );
}

export function ScanControls({
    experienceYears, setExperienceYears,
    preferences, setPreferences,
    isMatching,
    findJobs, onReset,
}) {
    const hasLocation = Boolean(preferences.location?.trim());
    const rangeProgress = Math.min(100, Math.max(0, (experienceYears / 30) * 100));

    return (
        <div className="divide-y divide-slate-900/[0.07] border-t border-slate-900/[0.07]">
            <section className="px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Experience
                            <Tooltip text="Jobs are ranked higher when their seniority matches your experience." />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">Calibrates seniority, not skill strength.</p>
                    </div>
                    <div className="rounded-lg bg-brand-50 px-2.5 py-1 font-mono text-xs font-bold text-brand-700">
                        {experienceYears} yr{experienceYears === 1 ? '' : 's'}
                    </div>
                </div>
                <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={experienceYears}
                    onChange={(event) => setExperienceYears(parseInt(event.target.value, 10))}
                    className="mm-search-range mt-4 w-full"
                    style={{ '--range-progress': `${rangeProgress}%` }}
                    aria-label="Years of experience"
                />
                <div className="mt-2 flex justify-between font-mono text-[9px] text-slate-400">
                    <span>0</span><span>5</span><span>10</span><span>20+</span>
                </div>
            </section>

            <section className="px-5 py-5 sm:px-6">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <label className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Search location <span className="text-brand-600">*</span>
                        </label>
                        <p className="mt-1 text-[11px] text-slate-500">Routes the right regional sources.</p>
                    </div>
                    <span className={`h-2 w-2 rounded-full ${hasLocation ? 'bg-accent-500' : 'bg-amber-400'}`} aria-hidden="true" />
                </div>
                <div className="mt-3">
                    <LocationAutocomplete
                        value={preferences.location || ''}
                        onChange={(value) => setPreferences((current) => ({ ...current, location: value }))}
                        variant="searchBrief"
                    />
                </div>
            </section>

            <footer className="bg-surface-50/80 px-4 py-4 sm:px-5">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset profile
                    </button>
                    <button
                        id="scan-btn"
                        type="button"
                        onClick={() => findJobs()}
                        disabled={isMatching || !hasLocation}
                        className="group flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-[0_8px_20px_rgba(24,31,46,0.16)] transition-all hover:-translate-y-0.5 hover:bg-brand-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                        {isMatching ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching sources...</>
                        ) : (
                            <><Search className="h-3.5 w-3.5" /> Search the market</>
                        )}
                    </button>
                </div>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-medium text-slate-400">
                    <ShieldCheck className="h-3 w-3 text-accent-600" /> Your profile stays private and editable.
                </div>
            </footer>
        </div>
    );
}
