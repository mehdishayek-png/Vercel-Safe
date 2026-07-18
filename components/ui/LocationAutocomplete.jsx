'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';

const LOCATIONS = [
    // Special
    'Remote',
    'Hybrid',
    // --- United States ---
    'New York, NY', 'San Francisco, CA', 'Los Angeles, CA', 'Chicago, IL',
    'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Denver, CO',
    'San Jose, CA', 'San Diego, CA', 'Dallas, TX', 'Houston, TX',
    'Atlanta, GA', 'Miami, FL', 'Washington, DC', 'Portland, OR',
    'Minneapolis, MN', 'Phoenix, AZ', 'Philadelphia, PA', 'Raleigh, NC',
    'Charlotte, NC', 'Nashville, TN', 'Salt Lake City, UT', 'Pittsburgh, PA',
    'Detroit, MI', 'Columbus, OH', 'Indianapolis, IN', 'Tampa, FL',
    'Orlando, FL', 'Las Vegas, NV', 'Sacramento, CA', 'St. Louis, MO',
    'Kansas City, MO', 'Cincinnati, OH', 'Cleveland, OH', 'Milwaukee, WI',
    'Jacksonville, FL', 'Richmond, VA', 'Boise, ID', 'Des Moines, IA',
    // --- India ---
    'Bengaluru, India', 'Mumbai, India', 'Delhi NCR, India', 'Hyderabad, India',
    'Pune, India', 'Chennai, India', 'Gurugram, India', 'Noida, India',
    'Kolkata, India', 'Ahmedabad, India', 'Jaipur, India', 'Chandigarh, India',
    'Kochi, India', 'Indore, India', 'Coimbatore, India', 'Thiruvananthapuram, India',
    // --- United Kingdom ---
    'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK',
    'Bristol, UK', 'Leeds, UK', 'Glasgow, UK', 'Cambridge, UK',
    'Oxford, UK', 'Liverpool, UK', 'Belfast, UK', 'Cardiff, UK',
    // --- Canada ---
    'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada', 'Calgary, Canada',
    'Ottawa, Canada', 'Edmonton, Canada', 'Waterloo, Canada', 'Winnipeg, Canada',
    // --- Europe ---
    'Berlin, Germany', 'Munich, Germany', 'Hamburg, Germany', 'Frankfurt, Germany',
    'Amsterdam, Netherlands', 'Paris, France', 'Dublin, Ireland', 'Zurich, Switzerland',
    'Stockholm, Sweden', 'Copenhagen, Denmark', 'Helsinki, Finland', 'Oslo, Norway',
    'Barcelona, Spain', 'Madrid, Spain', 'Milan, Italy', 'Lisbon, Portugal',
    'Warsaw, Poland', 'Prague, Czech Republic', 'Vienna, Austria', 'Brussels, Belgium',
    'Bucharest, Romania', 'Budapest, Hungary',
    // --- Asia Pacific ---
    'Singapore', 'Tokyo, Japan', 'Sydney, Australia', 'Melbourne, Australia',
    'Hong Kong', 'Seoul, South Korea', 'Taipei, Taiwan', 'Jakarta, Indonesia',
    'Bangkok, Thailand', 'Kuala Lumpur, Malaysia', 'Manila, Philippines',
    'Ho Chi Minh City, Vietnam', 'Auckland, New Zealand',
    // --- Middle East & Africa ---
    'Dubai, UAE', 'Abu Dhabi, UAE', 'Riyadh, Saudi Arabia', 'Tel Aviv, Israel',
    'Doha, Qatar', 'Cape Town, South Africa', 'Johannesburg, South Africa',
    'Nairobi, Kenya', 'Lagos, Nigeria', 'Cairo, Egypt',
    // --- Latin America ---
    'São Paulo, Brazil', 'Mexico City, Mexico', 'Buenos Aires, Argentina',
    'Bogotá, Colombia', 'Santiago, Chile', 'Lima, Peru', 'Medellín, Colombia',
    // --- Country-level (for broad searches) ---
    'United States', 'India', 'United Kingdom', 'Canada', 'Germany',
    'Australia', 'France', 'Netherlands', 'Singapore', 'UAE',
    'Worldwide',
];

export function LocationAutocomplete({ value, onChange, placeholder = 'e.g. San Francisco, CA or Remote', variant = 'default' }) {
    const [query, setQuery] = useState(value || '');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const containerRef = useRef(null);
    const listRef = useRef(null);

    // Sync external value
    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    const filtered = useCallback(() => {
        if (!query.trim()) return LOCATIONS.slice(0, 12);
        const q = query.toLowerCase();
        const exact = [];
        const startsWith = [];
        const contains = [];
        for (const loc of LOCATIONS) {
            const l = loc.toLowerCase();
            if (l === q) { exact.push(loc); continue; }
            if (l.startsWith(q)) { startsWith.push(loc); continue; }
            if (l.includes(q)) contains.push(loc);
        }
        return [...exact, ...startsWith, ...contains].slice(0, 10);
    }, [query]);

    const suggestions = filtered();

    const handleSelect = (loc) => {
        setQuery(loc);
        onChange(loc);
        setIsOpen(false);
        setHighlightIdx(-1);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setIsOpen(true);
        setHighlightIdx(-1);
        // Also fire onChange for free-text typing (so user can type custom locations)
        onChange(val);
    };

    const handleClear = () => {
        setQuery('');
        onChange('');
        setIsOpen(false);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx(prev => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
                handleSelect(suggestions[highlightIdx]);
            } else {
                setIsOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightIdx >= 0 && listRef.current) {
            const el = listRef.current.children[highlightIdx];
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIdx]);

    // Close on outside click
    useEffect(() => {
        const handle = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    const inputClassName = variant === 'searchBrief'
        ? 'w-full py-3 pl-10 pr-9 rounded-xl border border-slate-900/10 bg-white text-[13px] font-medium text-slate-900 shadow-[0_1px_2px_rgba(24,31,46,0.03)] outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
        : 'w-full text-sm py-2.5 pl-9 pr-8 rounded-lg border border-gray-200 bg-surface-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 text-gray-900';

    return (
        <div ref={containerRef} className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={inputClassName}
                autoComplete="off"
            />
            {query && (
                <button
                    onClick={handleClear}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    type="button"
                    tabIndex={-1}
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}

            {isOpen && suggestions.length > 0 && (
                <div
                    ref={listRef}
                    className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-lg py-1 scrollbar-thin"
                >
                    {suggestions.map((loc, i) => {
                        const isSpecial = loc === 'Remote' || loc === 'Hybrid' || loc === 'Worldwide';
                        return (
                            <button
                                key={loc}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelect(loc)}
                                className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${
                                    i === highlightIdx
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {isSpecial ? (
                                    <span className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                                    </span>
                                ) : (
                                    <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                )}
                                <span>{highlightMatch(loc, query)}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/** Highlight the matching portion of the text */
function highlightMatch(text, query) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <span className="font-semibold text-brand-600">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </>
    );
}
