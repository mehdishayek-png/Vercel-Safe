'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, X, RotateCcw, Lock } from 'lucide-react';
import {
    WORK_ARRANGEMENTS, WORK_TYPES, REGIONS, COMPANY_SIZES, SALARY_CURRENCIES,
    WORK_ARRANGEMENT_META, WORK_TYPE_META, REGION_META, COMPANY_SIZE_META,
} from '../lib/filters.js';

// ---------------------------------------------------------------------------
// Pill toggle button
// ---------------------------------------------------------------------------

function PillToggle({ label, description, active, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={description}
            className={[
                'text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all duration-150 select-none',
                disabled
                    ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                    : active
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600',
            ].join(' ')}
        >
            {label}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Labelled section with optional lock icon when flag is off
// ---------------------------------------------------------------------------

function FilterSection({ title, flagEnabled, children }) {
    return (
        <div className={flagEnabled ? '' : 'opacity-40 pointer-events-none select-none'}>
            <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] tracking-widest text-gray-400 uppercase font-semibold">{title}</span>
                {!flagEnabled && <Lock className="w-3 h-3 text-gray-300" />}
            </div>
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main FilterPanel
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
    const [open, setOpen] = useState(false);

    const masterOn = flags?.ADVANCED_FILTERS;

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* ---- Header — always visible ---- */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/70 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-900">Filters</span>
                    {isActive && masterOn && (
                        <span className="text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                            {activeCount}
                        </span>
                    )}
                    {!masterOn && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Coming Soon
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isActive && masterOn && (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); reset(); }}
                            className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* ---- Active summary pill ---- */}
            <AnimatePresence>
                {isActive && masterOn && !open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-2"
                    >
                        <div className="text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3 h-3 flex-shrink-0" />
                            <span className="line-clamp-1">{summary}</span>
                            <button
                                type="button"
                                onClick={reset}
                                className="ml-auto flex-shrink-0 text-indigo-400 hover:text-red-500 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ---- Expandable filter body ---- */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">

                            {/* Not yet enabled message */}
                            {!masterOn && (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 leading-relaxed">
                                    🔧 Advanced filters are coming soon. When enabled, you'll be able to narrow jobs by work arrangement, type, location, salary, and company size — before Panda scores them.
                                </div>
                            )}

                            {/* Work Arrangement */}
                            <FilterSection title="Work Arrangement" flagEnabled={masterOn}>
                                <div className="flex flex-wrap gap-1.5">
                                    {WORK_ARRANGEMENTS.map(val => (
                                        <PillToggle
                                            key={val}
                                            label={WORK_ARRANGEMENT_META[val]?.label || val}
                                            description={WORK_ARRANGEMENT_META[val]?.description}
                                            active={filters.workArrangements?.includes(val)}
                                            onClick={() => toggleWorkArrangement(val)}
                                            disabled={!masterOn}
                                        />
                                    ))}
                                </div>
                            </FilterSection>

                            {/* Work Type */}
                            <FilterSection title="Employment Type" flagEnabled={masterOn}>
                                <div className="flex flex-wrap gap-1.5">
                                    {WORK_TYPES.map(val => (
                                        <PillToggle
                                            key={val}
                                            label={WORK_TYPE_META[val]?.label || val}
                                            active={filters.workTypes?.includes(val)}
                                            onClick={() => toggleWorkType(val)}
                                            disabled={!masterOn}
                                        />
                                    ))}
                                </div>
                            </FilterSection>

                            {/* Region (gated by MULTI_REGION sub-flag) */}
                            <FilterSection title="Region" flagEnabled={masterOn && flags?.MULTI_REGION}>
                                {masterOn && !flags?.MULTI_REGION && (
                                    <p className="text-[10px] text-gray-400 mb-2">Multi-region search coming soon.</p>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {REGIONS.map(val => (
                                        <PillToggle
                                            key={val}
                                            label={REGION_META[val]?.label || val}
                                            active={filters.regions?.includes(val)}
                                            onClick={() => toggleRegion(val)}
                                            disabled={!masterOn || !flags?.MULTI_REGION}
                                        />
                                    ))}
                                </div>
                            </FilterSection>

                            {/* Salary (gated by SALARY_FILTER sub-flag) */}
                            <FilterSection title="Salary Floor" flagEnabled={masterOn && flags?.SALARY_FILTER}>
                                {masterOn && !flags?.SALARY_FILTER && (
                                    <p className="text-[10px] text-gray-400 mb-2">Salary filter coming soon.</p>
                                )}
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            min={0}
                                            placeholder="Min salary..."
                                            value={filters.salaryMin ?? ''}
                                            onChange={e => setSalaryMin(e.target.value ? Number(e.target.value) : null)}
                                            disabled={!masterOn || !flags?.SALARY_FILTER}
                                            className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-300 placeholder:text-gray-300 text-gray-900"
                                        />
                                    </div>
                                    <select
                                        value={filters.salaryCurrency || 'INR'}
                                        onChange={e => setSalaryCurrency(e.target.value)}
                                        disabled={!masterOn || !flags?.SALARY_FILTER}
                                        className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-400 text-gray-700 bg-white disabled:text-gray-300 disabled:bg-gray-50"
                                    >
                                        {SALARY_CURRENCIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                {(masterOn && flags?.SALARY_FILTER) && (
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.includeMissingSalary}
                                            onChange={e => setIncludeMissingSalary(e.target.checked)}
                                            className="rounded border-gray-300 accent-indigo-600"
                                        />
                                        <span className="text-[11px] text-gray-500">Include jobs without salary info</span>
                                    </label>
                                )}
                            </FilterSection>

                            {/* Company Size (gated by COMPANY_SIZE_FILTER sub-flag) */}
                            <FilterSection title="Company Size" flagEnabled={masterOn && flags?.COMPANY_SIZE_FILTER}>
                                {masterOn && !flags?.COMPANY_SIZE_FILTER && (
                                    <p className="text-[10px] text-gray-400 mb-2">Company size filter coming soon.</p>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {COMPANY_SIZES.map(val => (
                                        <PillToggle
                                            key={val}
                                            label={val.charAt(0).toUpperCase() + val.slice(1)}
                                            description={
                                                val === 'startup' ? '1–50 employees' :
                                                    val === 'scaleup' ? '51–200 employees' :
                                                        val === 'mid-size' ? '201–1000 employees' :
                                                            '1000+ employees'
                                            }
                                            active={filters.companySizes?.includes(val)}
                                            onClick={() => toggleCompanySize(val)}
                                            disabled={!masterOn || !flags?.COMPANY_SIZE_FILTER}
                                        />
                                    ))}
                                </div>
                            </FilterSection>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
