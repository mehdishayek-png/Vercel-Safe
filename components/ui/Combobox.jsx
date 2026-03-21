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
                    "bg-white dark:bg-[#1C1B19] border-ink-200 dark:border-[#2E2B27] text-ink-900 dark:text-ink-100 hover:border-brand-400",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-500",
                    disabled && "opacity-50 cursor-not-allowed bg-surface-50"
                )}
            >
                <span className={clsx("truncate", !selectedOption && "text-ink-400")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-ink-400 ml-2 shrink-0" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1C1B19] border border-ink-200 dark:border-[#2E2B27] rounded-lg shadow-elevated overflow-hidden"
                    >
                        <div className="p-2 border-b border-ink-100 dark:border-[#2E2B27] sticky top-0 bg-white dark:bg-[#1C1B19]">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full bg-surface-50 dark:bg-[#252420] border border-ink-200 dark:border-[#2E2B27] rounded-lg pl-8 pr-2 py-1.5 text-xs text-ink-900 dark:text-ink-100 focus:outline-none focus:bg-white dark:focus:bg-[#1C1B19] focus:border-brand-400 transition-colors"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto p-1">
                            {filteredOptions.length === 0 ? (
                                <div className="px-2 py-3 text-xs text-ink-400 text-center">
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
                                                ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium"
                                                : "text-ink-600 dark:text-ink-300 hover:bg-surface-50 dark:hover:bg-[#252420] hover:text-ink-900 dark:hover:text-ink-100"
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
                                <div className="px-2 py-2 text-[10px] text-ink-400 text-center italic border-t border-ink-100">
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
