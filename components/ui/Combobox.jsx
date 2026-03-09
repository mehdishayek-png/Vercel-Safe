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

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearch("");
    };

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={twMerge("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors duration-150",
                    "bg-white border-surface-200 text-gray-900 hover:border-brand-400",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500",
                    disabled && "opacity-50 cursor-not-allowed bg-surface-50"
                )}
            >
                <span className={clsx("truncate", !selectedOption && "text-gray-400")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-elevated overflow-hidden"
                    >
                        <div className="p-2 border-b border-surface-100 sticky top-0 bg-white">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full bg-surface-50 border border-surface-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-brand-400 transition-colors"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto p-1">
                            {filteredOptions.length === 0 ? (
                                <div className="px-2 py-3 text-xs text-gray-400 text-center">
                                    No results found.
                                </div>
                            ) : (
                                filteredOptions.slice(0, 100).map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelect(option)}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-sm transition-colors",
                                            value === option.value
                                                ? "bg-brand-50 text-brand-600 font-medium"
                                                : "text-gray-600 hover:bg-surface-50 hover:text-gray-900"
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
                                <div className="px-2 py-2 text-[10px] text-gray-400 text-center italic border-t border-surface-100">
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
