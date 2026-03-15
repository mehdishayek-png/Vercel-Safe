import { Loader2, Compass } from 'lucide-react';
import { Combobox } from '../ui/Combobox';

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
        <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-5">
            {/* Experience */}
            <div>
                <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Experience</span>
                    <span className="text-[13px] font-semibold text-brand-600">{experienceYears}y</span>
                </div>
                <input type="range" min="0" max="30" step="1" value={experienceYears} onChange={(e) => setExperienceYears(parseInt(e.target.value))} className="w-full accent-brand-600" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Entry</span><span>Mid</span><span>Senior+</span>
                </div>
            </div>

            {/* Location */}
            <div>
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Location</div>
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
                <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${
                    preferences.remoteOnly ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-surface-50 border-surface-200 text-gray-600 hover:bg-surface-100'
                }`}>
                    <input type="checkbox" checked={preferences.remoteOnly} onChange={e => setPreferences(prev => ({ ...prev, remoteOnly: e.target.checked }))} className="accent-emerald-500" />
                    Remote Only
                </label>

                <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                    exploreAdjacent ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-surface-50 border-surface-200 text-gray-600 hover:bg-surface-100'
                }`}>
                    <input type="checkbox" checked={exploreAdjacent} onChange={e => setExploreAdjacent(e.target.checked)} className="accent-violet-500" />
                    <span className="font-medium flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        Explore Adjacent Roles
                    </span>
                </label>

                {tokensLoading ? (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-surface-50 border-surface-200 animate-pulse">
                        <div className="w-4 h-4 rounded bg-surface-200" />
                        <div className="h-3 bg-surface-200 rounded w-24" />
                    </div>
                ) : (
                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                        midasSearch ? 'bg-accent-50 border-accent-200 text-accent-700' : 'bg-surface-50 border-surface-200 text-gray-600 hover:bg-surface-100'
                    }`}>{/* Beta: no disabled state. Restore: onClick={(e) => { if (!isAdminUser && tokenBalance < 2 && weeklyMidasScanCount >= 1) e.preventDefault(); }} */}
                        <input type="checkbox" checked={midasSearch}
                            onChange={e => setMidasSearch(e.target.checked)} /* Beta: always enabled. Restore: onChange={e => { if (isAdminUser || tokenBalance >= 2 || weeklyMidasScanCount < 1) setMidasSearch(e.target.checked); }} */
                            className="accent-accent-600"
                        />
                        <span className="font-medium">
                            Super Search
                            <span className="font-normal text-gray-400 ml-1">
                                {'(free)'  /* Beta: all free. Restore: isAdminUser ? '(admin)' : weeklyMidasScanCount < 1 ? '(1 free/wk)' : tokenBalance < 2 ? '(need 2)' : '(2 tokens)' */}
                            </span>
                        </span>
                    </label>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button onClick={onReset} className="flex-1 py-2.5 rounded-lg border border-surface-200 bg-white text-xs font-medium text-gray-500 hover:bg-surface-50 cursor-pointer transition-colors">
                    Reset
                </button>
                <button
                    onClick={findJobs}
                    disabled={isMatching}
                    className="flex-[2.5] py-2.5 rounded-lg border-none text-xs font-semibold text-white cursor-pointer bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isMatching ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Scanning...</span>
                    ) : !isSignedIn ? 'Sign in to Scan'
                        : midasSearch
                            ? 'Super Scan (Free)' // Beta: all scans free. Restore: isAdminUser || weeklyMidasScanCount < 1 ? 'Super Scan (Free)' : tokenBalance >= 2 ? 'Super Scan (2 tokens)' : 'Need 2 Tokens'
                            : `Scan (${freeScansRemaining} free)`
                    }
                </button>
            </div>
        </div>
    );
}
