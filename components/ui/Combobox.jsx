import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Combobox({
    options = [],
    value,
    onChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    className,
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    // Filter options based on search
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle selection
    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearch(""); // Reset search on select
    };

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={twMerge("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all duration-200",
                    "bg-white/5 border-white/10 text-white/90 hover:bg-white/10 hover:border-white/20",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <span className={clsx("truncate", !selectedOption && "text-white/40")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-white/40 ml-2 shrink-0" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-white/10 rounded-lg shadow-xl shadow-black/50 overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="p-2 border-b border-white/5 sticky top-0 bg-[#0A0A0A]">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full bg-white/5 border border-white/5 rounded pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:bg-white/10 transition-colors"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filteredOptions.length === 0 ? (
                                <div className="px-2 py-3 text-xs text-white/30 text-center">
                                    No results found.
                                </div>
                            ) : (
                                // Limit to 100 items to prevent UI lag with large lists like cities
                                filteredOptions.slice(0, 100).map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelect(option)}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-sm transition-colors",
                                            value === option.value
                                                ? "bg-indigo-500/20 text-indigo-300"
                                                : "text-white/70 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <span className="truncate mr-2 flex items-center gap-2">
                                            {option.flag && <span>{option.flag}</span>}
                                            {option.label}
                                        </span>
                                        {value === option.value && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                ))
                            )}
                            {filteredOptions.length > 100 && (
                                <div className="px-2 py-2 text-[10px] text-white/30 text-center italic border-t border-white/5">
                                    Type to narrow down results...
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
