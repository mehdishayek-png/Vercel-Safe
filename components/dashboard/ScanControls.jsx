import { Loader2, Info } from 'lucide-react';
import { useState } from 'react';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';

function Tooltip({ text, children }) {
    const [show, setShow] = useState(false);
    return (
        <span className="relative inline-flex items-center"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-[11px] leading-relaxed w-56 text-center shadow-lg z-50 pointer-events-none">
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
    isAdminUser, isMatching,
    findJobs, onReset,
}) {
    return (
        <div className="glass-panel rounded-[2rem] border border-transparent p-5 space-y-5">
            {/* Experience */}
            <div>
                <div className="flex justify-between items-baseline mb-2">
                    <span className="font-headline text-[10px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1">
                        Experience
                        <Tooltip text="Your years of experience. Jobs are scored higher when their seniority level matches your experience.">
                            <Info className="w-3 h-3 text-gray-400" />
                        </Tooltip>
                    </span>
                    <span className="text-[13px] font-semibold text-brand-600">{experienceYears}y</span>
                </div>
                <input
                    type="range" min="0" max="30" step="1"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(parseInt(e.target.value))}
                    className="w-full accent-brand-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Entry</span><span>Mid</span><span>Senior+</span>
                </div>
            </div>

            {/* Location */}
            <div>
                <div className="font-headline text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">
                    Location <span className="text-brand-500">*</span>
                </div>
                <LocationAutocomplete
                    value={preferences.location || ''}
                    onChange={(val) => setPreferences(prev => ({ ...prev, location: val }))}
                />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button
                    onClick={onReset}
                    className="flex-1 py-2.5 rounded-full border-none bg-transparent text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 cursor-pointer transition-all duration-200"
                >
                    Reset
                </button>
                <button
                    id="scan-btn"
                    onClick={() => findJobs()}
                    disabled={isMatching}
                    className="flex-[2.5] py-2.5 rounded-full border-none text-xs font-semibold text-white cursor-pointer bg-flow-gradient shadow-xl shadow-brand-500/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {isMatching ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />Scanning...
                        </span>
                    ) : (
                        <span>Scan {isAdminUser ? '(admin)' : '(1 token)'}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
