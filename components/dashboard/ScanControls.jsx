import { Loader2, Compass, Info, Lightbulb, TrendingUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { MapPin, Sparkles } from 'lucide-react';
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
    exploreAdjacent, setExploreAdjacent,
    midasSearch, setMidasSearch,
    tokensLoading, tokenBalance, weeklyMidasScanCount, isAdminUser,
    isMatching, isSignedIn,
    findJobs, onReset,
}) {
    const [showTips, setShowTips] = useState(false);
    
    // Add logic to toggle premiumStartups
    const handlePremiumToggle = (e) => {
        setPreferences(prev => ({ ...prev, premiumStartups: e.target.checked }));
    };

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
                <input type="range" min="0" max="30" step="1" value={experienceYears} onChange={(e) => setExperienceYears(parseInt(e.target.value))} className="w-full accent-brand-600" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Entry</span><span>Mid</span><span>Senior+</span>
                </div>
            </div>

            {/* Location */}
            <div>
                <div className="font-headline text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">Location</div>
                <LocationAutocomplete
                    value={preferences.location || ''}
                    onChange={(val) => setPreferences(prev => ({ ...prev, location: val }))}
                />
            </div>


            {/* Pro Tips accordion */}
            <div className={`border rounded-xl transition-colors duration-200 ${showTips ? 'border-amber-200 bg-amber-50/30' : 'border-outline-variant/10 bg-transparent hover:bg-surface-50'}`}>
                <button 
                    onClick={() => setShowTips(!showTips)}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-gray-700 hover:text-amber-700 transition-colors cursor-pointer"
                >
                    <span className="flex items-center gap-1.5">
                        <Lightbulb className={`w-3.5 h-3.5 ${showTips ? 'text-amber-500' : 'text-gray-400'}`} /> 
                        Tips to improve matches
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showTips ? 'rotate-180' : ''}`} />
                </button>
                {showTips && (
                    <div className="p-3 pt-0 border-t border-amber-100/50">
                        <ul className="space-y-2 text-[11px] text-gray-600 mt-2">
                            <li className="flex gap-2 items-start">
                                <TrendingUp className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <span>Use a <strong>specific target title</strong> &mdash; &ldquo;Backend Engineer&rdquo; beats &ldquo;Software Developer&rdquo;</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <TrendingUp className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <span>Add <strong>tools you use</strong> as skills (Jira, Figma, Node.js) &mdash; not just soft skills</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <TrendingUp className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <span>Be specific with <strong>Location</strong> (e.g., &ldquo;Austin, TX&rdquo;) or toggle <strong>Remote Only</strong></span>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button onClick={onReset} className="flex-1 py-2.5 rounded-full border-none bg-transparent text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 cursor-pointer transition-all duration-200">
                    Reset
                </button>
                <button
                    id="scan-btn"
                    onClick={() => findJobs()}
                    disabled={isMatching}
                    className="flex-[2.5] py-2.5 rounded-full border-none text-xs font-semibold text-white cursor-pointer bg-flow-gradient shadow-xl shadow-brand-500/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {isMatching ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Scanning...</span>
                    ) : (
                        <span>Scan {isAdminUser ? '(admin)' : '(1 token)'}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
