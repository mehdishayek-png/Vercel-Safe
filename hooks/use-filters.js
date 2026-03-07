// =============================================================================
// useFilters — React hook for managing filter state
// =============================================================================
// Manages filter state in memory (React state). Respects feature flags to
// hide unavailable filters. Single source of truth for filter UI state.
//
// v1 (now): React state only (stateless, lost on page reload)
// v2 (later): Save to user profile via API for cross-device persistence
// =============================================================================

import { useState, useCallback, useMemo } from 'react';
import { DEFAULT_FILTER_CONFIG, DEFAULT_FEATURE_FLAGS } from '../lib/filters.js';
import { hasActiveFilters, humanFilterSummary } from '../lib/pre-filter.js';
import { getClientFeatureFlags } from '../lib/feature-flags.js';

// ---------------------------------------------------------------------------
// Toggle helper: add if not present, remove if present
// ---------------------------------------------------------------------------

function toggleInArray(arr, value) {
    if (!arr) return [value];
    return arr.includes(value)
        ? arr.filter(v => v !== value)
        : [...arr, value];
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useFilters() {
    const [filters, setFiltersState] = useState(() => ({ ...DEFAULT_FILTER_CONFIG }));

    const [flags] = useState(() => {
        // Read flags synchronously on mount (client-side env vars only)
        if (typeof window !== 'undefined') {
            try {
                return getClientFeatureFlags();
            } catch {
                return { ...DEFAULT_FEATURE_FLAGS };
            }
        }
        return { ...DEFAULT_FEATURE_FLAGS };
    });

    // -----------------------------------------------------------------------
    // Derived state
    // -----------------------------------------------------------------------

    const isActive = useMemo(() => hasActiveFilters(filters), [filters]);
    const summary = useMemo(() => humanFilterSummary(filters), [filters]);
    const activeCount = useMemo(() => {
        let count = 0;
        if (filters.workArrangements && filters.workArrangements.length > 0) count++;
        if (filters.workTypes && filters.workTypes.length > 0) count++;
        if (filters.regions && filters.regions.length > 0) count++;
        if (filters.salaryMin !== null && filters.salaryMin !== undefined) count++;
        if (filters.companySizes && filters.companySizes.length > 0) count++;
        return count;
    }, [filters]);

    // -----------------------------------------------------------------------
    // Setters
    // -----------------------------------------------------------------------

    const toggleWorkArrangement = useCallback(value => {
        setFiltersState(prev => ({
            ...prev,
            workArrangements: toggleInArray(prev.workArrangements, value),
        }));
    }, []);

    const toggleWorkType = useCallback(value => {
        setFiltersState(prev => ({
            ...prev,
            workTypes: toggleInArray(prev.workTypes, value),
        }));
    }, []);

    const toggleRegion = useCallback(value => {
        setFiltersState(prev => ({
            ...prev,
            regions: toggleInArray(prev.regions, value),
        }));
    }, []);

    const toggleCompanySize = useCallback(value => {
        setFiltersState(prev => ({
            ...prev,
            companySizes: toggleInArray(prev.companySizes, value),
        }));
    }, []);

    const setSalaryMin = useCallback(value => {
        setFiltersState(prev => ({ ...prev, salaryMin: value }));
    }, []);

    const setSalaryCurrency = useCallback(currency => {
        setFiltersState(prev => ({ ...prev, salaryCurrency: currency }));
    }, []);

    const setIncludeMissingSalary = useCallback(include => {
        setFiltersState(prev => ({ ...prev, includeMissingSalary: include }));
    }, []);

    const reset = useCallback(() => {
        setFiltersState({ ...DEFAULT_FILTER_CONFIG });
    }, []);

    const setFilters = useCallback(config => {
        setFiltersState(prev => ({ ...prev, ...config }));
    }, []);

    return {
        filters,
        flags,
        isActive,
        summary,
        activeCount,
        toggleWorkArrangement,
        toggleWorkType,
        toggleRegion,
        toggleCompanySize,
        setSalaryMin,
        setSalaryCurrency,
        setIncludeMissingSalary,
        reset,
        setFilters,
    };
}
