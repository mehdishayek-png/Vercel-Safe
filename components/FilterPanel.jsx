'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, X, RotateCcw, Lock } from 'lucide-react';
import {
    WORK_ARRANGEMENTS, WORK_TYPES, REGIONS, COMPANY_SIZES, SALARY_CURRENCIES,
    WORK_ARRANGEMENT_META, WORK_TYPE_META, REGION_META, COMPANY_SIZE_META,
} from '../lib/filters.js';

function PillToggle({ label, description, active, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={description}
            className={[
                'text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors duration-150 select-none cursor-pointer',
                disabled
                    ? 'border-surface-100 bg-surface-50 text-gray-300 cursor-not-allowed'
                    : active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-surface-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-600',
            ].join(' ')}
        >
            {label}
        </button>
    );
}

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

export function FilterPanel({
    filters, flags, isActive, activeCount, summary,
    toggleWorkArrangement, toggleWorkType, toggleRegion, toggleCompanySize,
    setSalaryMin, setSalaryCurrency, setIncludeMissingSalary, reset,
}) {
    const [open, setOpen] = useState(false);
    const masterOn = flags?.ADVANCED_FILTERS;

    return (
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-50 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-brand-500" />
                    <span className="text-sm font-medium text-gray-900">Filters</span>
                    {isActive && masterOn && (
                        <span className="text-[10px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded-md">{activeCount}</span>
                    )}
                    {!masterOn && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Coming Soon
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isActive && masterOn && (
                        <button type="button" onClick={e => { e.stopPropagation(); reset(); }} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer">
                            <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {isActive && masterOn && !open && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pb-2">
                        <div className="text-[11px] text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3 h-3 flex-shrink-0" />
                            <span className="line-clamp-1">{summary}</span>
                            <button type="button" onClick={reset} className="ml-auto flex-shrink-0 text-brand-400 hover:text-red-500 transition-colors cursor-pointer">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-4 border-t border-surface-100 pt-3">
                            {!masterOn && (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 leading-relaxed">
                                    Advanced filters are coming soon. Narrow jobs by work arrangement, type, location, salary, and company size.
                                </div>
                            )}

                            <FilterSection title="Work Arrangement" flagEnabled={masterOn}>
                                <div className="flex flex-wrap gap-1.5">
                                    {WORK_ARRANGEMENTS.map(val => (
                                        <PillToggle key={val} label={WORK_ARRANGEMENT_META[val]?.label || val} description={WORK_ARRANGEMENT_META[val]?.description}
                                            active={filters.workArrangements?.includes(val)} onClick={() => toggleWorkArrangement(val)} disabled={!masterOn} />
                                    ))}
                                </div>
                            </FilterSection>

                            <FilterSection title="Employment Type" flagEnabled={masterOn}>
                                <div className="flex flex-wrap gap-1.5">
                                    {WORK_TYPES.map(val => (
                                        <PillToggle key={val} label={WORK_TYPE_META[val]?.label || val} active={filters.workTypes?.includes(val)} onClick={() => toggleWorkType(val)} disabled={!masterOn} />
                                    ))}
                                </div>
                            </FilterSection>

                            <FilterSection title="Region" flagEnabled={masterOn && flags?.MULTI_REGION}>
                                {masterOn && !flags?.MULTI_REGION && <p className="text-[10px] text-gray-400 mb-2">Multi-region coming soon.</p>}
                                <div className="flex flex-wrap gap-1.5">
                                    {REGIONS.map(val => (
                                        <PillToggle key={val} label={REGION_META[val]?.label || val} active={filters.regions?.includes(val)} onClick={() => toggleRegion(val)} disabled={!masterOn || !flags?.MULTI_REGION} />
                                    ))}
                                </div>
                            </FilterSection>

                            <FilterSection title="Salary Floor" flagEnabled={masterOn && flags?.SALARY_FILTER}>
                                {masterOn && !flags?.SALARY_FILTER && <p className="text-[10px] text-gray-400 mb-2">Salary filter coming soon.</p>}
                                <div className="flex gap-2">
                                    <input type="number" min={0} placeholder="Min salary..." value={filters.salaryMin ?? ''} onChange={e => setSalaryMin(e.target.value ? Number(e.target.value) : null)} disabled={!masterOn || !flags?.SALARY_FILTER}
                                        className="flex-1 text-xs px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-400 disabled:bg-surface-50 disabled:text-gray-300 placeholder:text-gray-300 text-gray-900" />
                                    <select value={filters.salaryCurrency || 'INR'} onChange={e => setSalaryCurrency(e.target.value)} disabled={!masterOn || !flags?.SALARY_FILTER}
                                        className="text-xs border border-surface-200 rounded-lg px-2 py-2 focus:outline-none focus:border-brand-400 text-gray-700 bg-white disabled:text-gray-300 disabled:bg-surface-50">
                                        {SALARY_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                {masterOn && flags?.SALARY_FILTER && (
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input type="checkbox" checked={filters.includeMissingSalary} onChange={e => setIncludeMissingSalary(e.target.checked)} className="rounded border-gray-300 accent-brand-600" />
                                        <span className="text-[11px] text-gray-500">Include jobs without salary info</span>
                                    </label>
                                )}
                            </FilterSection>

                            <FilterSection title="Company Size" flagEnabled={masterOn && flags?.COMPANY_SIZE_FILTER}>
                                {masterOn && !flags?.COMPANY_SIZE_FILTER && <p className="text-[10px] text-gray-400 mb-2">Coming soon.</p>}
                                <div className="flex flex-wrap gap-1.5">
                                    {COMPANY_SIZES.map(val => (
                                        <PillToggle key={val} label={val.charAt(0).toUpperCase() + val.slice(1)}
                                            description={val === 'startup' ? '1-50' : val === 'scaleup' ? '51-200' : val === 'mid-size' ? '201-1000' : '1000+'}
                                            active={filters.companySizes?.includes(val)} onClick={() => toggleCompanySize(val)} disabled={!masterOn || !flags?.COMPANY_SIZE_FILTER} />
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
