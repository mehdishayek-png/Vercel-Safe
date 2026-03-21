import { Loader2, Compass, Info } from 'lucide-react';
import { useState } from 'react';
import { Combobox } from '../ui/Combobox';

function Tooltip({ text, children }) {
    const [show, setShow] = useState(false);
    return (
        <span className="relative inline-flex items-center"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-[11px] leading-relaxed w-56 text-center shadow-lg z-50 pointer-events-none">
                    {text}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </span>
            )}
        </span>
    );
}

export function ScanControls({
    experienceYears, setExperienceYears,
    preferences, setPreferences,
    countries, states, cities,
    exploreAdjacent, setExploreAdjacent,
    midasSearch, setMidasSearch,
    tokensLoading, tokenBalance, weeklyMidasScanCount, isAdminUser,
    isMatching, isSignedIn, freeScansRemaining,
    findJobs, onReset,
}) {
    return (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 space-y-5 shadow-sm">
            {/* Experience */}
            <div>
                <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase flex items-center gap-1 font-headline">
                        Experience
                        <Tooltip text="Your years of experience. Jobs are scored higher when their seniority level matches your experience.">
                            <Info className="w-3 h-3 text-slate-400" />
                        </Tooltip>
                    </span>
                    <span className="text-[13px] font-bold text-brand-600 font-headline">{experienceYears}y</span>
                </div>
                <input type="range" min="0" max="30" step="1" value={experienceYears} onChange={(e) => setExperienceYears(parseInt(e.target.value))} className="w-full accent-brand-600" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Entry</span><span>Mid</span><span>Senior+</span>
                </div>
            </div>

            {/* Location */}
            <div>
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2 font-headline">Location</div>
                <Combobox
                    options={countries}
                    value={preferences.country}
                    onChange={(val) => setPreferences(prev => ({ ...prev, country: val }))}
                    placeholder="Country..."
                />
                {!preferences.remoteOnly && (states.length > 0 || cities.length > 0) && (
                    <div className="flex gap-2 mt-2">
                        {states.length > 0 && (
                            <div className="flex-1">
                                <Combobox options={states} value={preferences.state} onChange={(val) => setPreferences(prev => ({ ...prev, state: val }))} placeholder="State..." />
                            </div>
                        )}
                        {cities.length > 0 && (
                            <div className="flex-1">
                                <Combobox options={cities} value={preferences.city} onChange={(val) => setPreferences(prev => ({ ...prev, city: val }))} placeholder="City..." />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-medium ${
                    preferences.remoteOnly ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-midas-surface-low/50 border-slate-200/60 text-gray-600 hover:bg-midas-surface-low'
                }`}>
                    <input type="checkbox" checked={preferences.remoteOnly} onChange={e => setPreferences(prev => ({ ...prev, remoteOnly: e.target.checked }))} className="accent-emerald-500" />
                    Remote Only
                    <Tooltip text="Only show jobs that are listed as remote or work-from-home. Filters out office-based roles.">
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" />
                    </Tooltip>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                    exploreAdjacent ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm' : 'bg-midas-surface-low/50 border-slate-200/60 text-gray-600 hover:bg-midas-surface-low'
                }`}>
                    <input type="checkbox" checked={exploreAdjacent} onChange={e => setExploreAdjacent(e.target.checked)} className="accent-violet-500" />
                    <span className="font-medium flex items-center gap-1.5 flex-1">
                        <Compass className="w-3.5 h-3.5" />
                        Explore Adjacent Roles
                    </span>
                    <Tooltip text="Loosens matching to include roles outside your exact career track. Great for career pivots or discovering unexpected fits.">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </Tooltip>
                </label>

                {tokensLoading ? (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl border bg-midas-surface-low/50 border-slate-200/60 animate-pulse">
                        <div className="w-4 h-4 rounded bg-slate-200" />
                        <div className="h-3 bg-slate-200 rounded w-24" />
                    </div>
                ) : (
                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                        midasSearch ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'bg-midas-surface-low/50 border-slate-200/60 text-gray-600 hover:bg-midas-surface-low'
                    }`}>
                        <input type="checkbox" checked={midasSearch}
                            onChange={e => setMidasSearch(e.target.checked)}
                            className="accent-brand-600"
                        />
                        <span className="font-medium flex-1">
                            Super Search
                            <span className="font-normal text-slate-400 ml-1">
                                {'(free)'}
                            </span>
                        </span>
                        <Tooltip text="Fetches deeper results from job boards for wider coverage. Best for niche roles where page 1 results aren't enough.">
                            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </Tooltip>
                    </label>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button onClick={onReset} className="flex-1 py-3 rounded-xl border border-slate-200/60 bg-white text-xs font-semibold text-slate-500 hover:bg-midas-surface-low cursor-pointer transition-colors">
                    Reset
                </button>
                <button
                    onClick={findJobs}
                    disabled={isMatching}
                    className="flex-[2.5] py-3 rounded-xl border-none text-xs font-bold text-white cursor-pointer bg-brand-600 hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/30"
                >
                    {isMatching ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Scanning...</span>
                    ) : midasSearch
                            ? <span className="flex items-center justify-center gap-1.5">Super Scan (Free) <span className="text-[9px] font-bold px-1.5 py-0 rounded-full bg-white/20 text-white uppercase tracking-wider leading-relaxed">Beta</span></span>
                            : <span className="flex items-center justify-center gap-1.5">Scan ({freeScansRemaining} free) <span className="text-[9px] font-bold px-1.5 py-0 rounded-full bg-white/20 text-white uppercase tracking-wider leading-relaxed">Beta</span></span>
                    }
                </button>
            </div>
        </div>
    );
}
