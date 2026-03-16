'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, X, RotateCcw, Lock, Check } from 'lucide-react';
import {
    WORK_ARRANGEMENTS, WORK_TYPES, REGIONS, COMPANY_SIZES, SALARY_CURRENCIES,
    WORK_ARRANGEMENT_META, WORK_TYPE_META, REGION_META, COMPANY_SIZE_META,
} from '../lib/filters.js';

// ---------------------------------------------------------------------------
// Dropdown pill — Seekify-inspired horizontal filter chip with dropdown
// ---------------------------------------------------------------------------

function FilterDropdown({ label, options, selected, onToggle, disabled, getMeta }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const activeCount = selected?.length || 0;
    const hasSelection = activeCount > 0;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                disabled={disabled}
                className={[
                    'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-all duration-150 whitespace-nowrap',
                    disabled
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : hasSelection
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                ].join(' ')}
            >
                {label}
                {hasSelection && (
                    <span className="bg-indigo-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {activeCount}
                    </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''} ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
            </button>

            <AnimatePresence>
                {open && !disabled && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl shadow-gray-200/50 z-50 min-w-[180px] py-1.5 overflow-hidden"
                    >
                        {options.map(val => {
                            const meta = getMeta?.(val);
                            const isActive = selected?.includes(val);
                            return (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => onToggle(val)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                        isActive ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                                    }`}>
                                        {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <span>{meta?.label || val.charAt(0).toUpperCase() + val.slice(1)}</span>
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main FilterPanel — Horizontal pill bar (Seekify / Dribbble-inspired)
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   filters: import('../lib/pre-filter').FilterConfig,
 *   flags: import('../lib/filters').FeatureFlags,
 *   isActive: boolean,
 *   activeCount: number,
 *   summary: string,
 *   toggleWorkArrangement: (v: string) => void,
 *   toggleWorkType: (v: string) => void,
 *   toggleRegion: (v: string) => void,
 *   toggleCompanySize: (v: string) => void,
 *   setSalaryMin: (v: number | null) => void,
 *   setSalaryCurrency: (v: string) => void,
 *   setIncludeMissingSalary: (v: boolean) => void,
 *   reset: () => void,
 * }} props
 */
export function FilterPanel({
    filters,
    flags,
    isActive,
    activeCount,
    summary,
    toggleWorkArrangement,
    toggleWorkType,
    toggleRegion,
    toggleCompanySize,
    setSalaryMin,
    setSalaryCurrency,
    setIncludeMissingSalary,
    reset,
}) {
    const masterOn = flags?.ADVANCED_FILTERS;
    const [salaryOpen, setSalaryOpen] = useState(false);
    const salaryRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (salaryRef.current && !salaryRef.current.contains(e.target)) setSalaryOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Filter icon label */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                Filters
                {!masterOn && (
                    <span className="text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ml-1">
                        <Lock className="w-2.5 h-2.5" />
                        Soon
                    </span>
                )}
            </div>

            {/* Work Arrangement */}
            <FilterDropdown
                label="Arrangement"
                options={WORK_ARRANGEMENTS}
                selected={filters.workArrangements}
                onToggle={toggleWorkArrangement}
                disabled={!masterOn}
                getMeta={(v) => WORK_ARRANGEMENT_META[v]}
            />

            {/* Employment Type */}
            <FilterDropdown
                label="Job Type"
                options={WORK_TYPES}
                selected={filters.workTypes}
                onToggle={toggleWorkType}
                disabled={!masterOn}
                getMeta={(v) => WORK_TYPE_META[v]}
            />

            {/* Region */}
            <FilterDropdown
                label="Region"
                options={REGIONS}
                selected={filters.regions}
                onToggle={toggleRegion}
                disabled={!masterOn || !flags?.MULTI_REGION}
                getMeta={(v) => REGION_META[v]}
            />

            {/* Company Size */}
            <FilterDropdown
                label="Company Size"
                options={COMPANY_SIZES}
                selected={filters.companySizes}
                onToggle={toggleCompanySize}
                disabled={!masterOn || !flags?.COMPANY_SIZE_FILTER}
                getMeta={(v) => COMPANY_SIZE_META?.[v] || { label: v.charAt(0).toUpperCase() + v.slice(1) }}
            />

            {/* Salary — custom dropdown */}
            <div ref={salaryRef} className="relative">
                <button
                    type="button"
                    onClick={() => masterOn && flags?.SALARY_FILTER && setSalaryOpen(o => !o)}
                    disabled={!masterOn || !flags?.SALARY_FILTER}
                    className={[
                        'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-all duration-150 whitespace-nowrap',
                        (!masterOn || !flags?.SALARY_FILTER)
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : filters.salaryMin
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    ].join(' ')}
                >
                    {filters.salaryMin ? `${filters.salaryCurrency || 'INR'} ${filters.salaryMin.toLocaleString()}+` : 'Salary'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${salaryOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {salaryOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl shadow-gray-200/50 z-50 w-[240px] p-3 space-y-2.5"
                        >
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    placeholder="Min salary..."
                                    value={filters.salaryMin ?? ''}
                                    onChange={e => setSalaryMin(e.target.value ? Number(e.target.value) : null)}
                                    className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 text-gray-900 placeholder:text-gray-300"
                                />
                                <select
                                    value={filters.salaryCurrency || 'INR'}
                                    onChange={e => setSalaryCurrency(e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 text-gray-700 bg-white"
                                >
                                    {SALARY_CURRENCIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.includeMissingSalary}
                                    onChange={e => setIncludeMissingSalary(e.target.checked)}
                                    className="rounded border-gray-300 accent-indigo-600"
                                />
                                <span className="text-[11px] text-gray-500">Include jobs without salary</span>
                            </label>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Reset button */}
            {isActive && masterOn && (
                <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-red-500 transition-colors ml-1"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                </button>
            )}
        </div>
    );
}
