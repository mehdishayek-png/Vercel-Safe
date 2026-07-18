import { create } from 'zustand';
export const useSearchStore = create((set, get) => ({
    // Job results
    jobs: [],
    isMatching: false,
    hasSearched: false,
    searchError: null,
    logs: [],
    deepAnalysisProgress: null,
    sortBy: 'score',
    activeTab: 'matches',

    // Search settings
    midasSearch: false,
    exploreAdjacent: false,
    preferences: { location: '', remoteOnly: false },

    // UI
    showReturnNotification: false,

    // Recommendations
    recommendations: [],
    isLoadingRecs: false,
    recsError: null,
    recsLastFetched: null,

    // Setters
    setJobs: (updater) => {
        if (typeof updater === 'function') {
            set((state) => ({ jobs: updater(state.jobs) }));
        } else {
            set({ jobs: updater });
        }
    },
    setIsMatching: (isMatching) => set({ isMatching }),
    setHasSearched: (hasSearched) => set({ hasSearched }),
    setSearchError: (searchError) => set({ searchError }),
    setLogs: (logs) => set({ logs }),
    setDeepAnalysisProgress: (deepAnalysisProgress) => set({ deepAnalysisProgress }),
    setSortBy: (sortBy) => set({ sortBy }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setMidasSearch: (midasSearch) => set({ midasSearch }),
    setExploreAdjacent: (exploreAdjacent) => set({ exploreAdjacent }),
    setPreferences: (updater) => {
        if (typeof updater === 'function') {
            set((state) => ({ preferences: updater(state.preferences) }));
        } else {
            set({ preferences: updater });
        }
    },
    setShowReturnNotification: (showReturnNotification) => set({ showReturnNotification }),
    setRecommendations: (recommendations) => set({ recommendations }),

    addLog: (msg) => {
        set((state) => ({
            logs: [...state.logs, {
                message: msg,
                time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
            }]
        }));
    },



    // Fetch recommendations
    fetchRecommendations: async (force = false, { profile, savedJobsData, appliedJobsData } = {}) => {
        const state = get();
        if (!profile || !profile.skills || profile.skills.length === 0) return;
        if (state.isLoadingRecs) return;

        if (!force && state.recsLastFetched && (Date.now() - state.recsLastFetched) < 30 * 60 * 1000) return;

        // Check localStorage cache first
        if (!force) {
            try {
                const cached = localStorage.getItem('midas_recommendations');
                if (cached) {
                    const { recs, timestamp } = JSON.parse(cached);
                    const ageMin = (Date.now() - timestamp) / 1000 / 60;
                    if (ageMin < 30 && recs.length > 0) {
                        set({ recommendations: recs, recsLastFetched: timestamp });
                        return;
                    }
                }
            } catch {}
        }

        set({ isLoadingRecs: true, recsError: null });

        try {
            const seenJobUrls = [
                ...state.jobs.map(j => j.apply_url),
                ...(savedJobsData || []).map(j => j.apply_url),
                ...(appliedJobsData || []).map(j => j.apply_url),
            ].filter(Boolean);

            const res = await fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile,
                    savedJobs: savedJobsData || [],
                    appliedJobs: appliedJobsData || [],
                    preferences: state.preferences,
                    seenJobUrls,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to fetch recommendations');
            }

            const data = await res.json();
            const recs = data.recommendations || [];
            set({ recommendations: recs, recsLastFetched: Date.now() });

            try {
                localStorage.setItem('midas_recommendations', JSON.stringify({
                    recs, timestamp: Date.now(),
                }));
            } catch {}
        } catch (err) {
            set({ recsError: err.message });
        } finally {
            set({ isLoadingRecs: false });
        }
    },

    // Called once on mount
    init: async () => {
        let localResultsTimestamp = 0;
        // Load preferences
        try {
            const stored = localStorage.getItem('midas_preferences');
            if (stored) set({ preferences: JSON.parse(stored) });
        } catch {}

        // Load cached results
        try {
            const storedResults = localStorage.getItem('midas_results');
            if (storedResults) {
                const { jobs: savedJobs, timestamp } = JSON.parse(storedResults);
                localResultsTimestamp = Number(timestamp) || 0;
                const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;
                if (ageInMinutes < 60) {
                    set({ jobs: savedJobs });
                } else {
                    localStorage.removeItem('midas_results');
                }
            }
        } catch {}

        // Prefer a newer server-persisted search so results survive device changes.
        try {
            const res = await fetch('/api/search-history?limit=1', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                const serverTimestamp = data.runs?.[0]?.created_at
                    ? new Date(data.runs[0].created_at).getTime()
                    : 0;
                if (data.source === 'server' && data.jobs?.length > 0 && serverTimestamp > localResultsTimestamp) {
                    set({ jobs: data.jobs, hasSearched: true });
                    try {
                        localStorage.setItem('midas_results', JSON.stringify({ jobs: data.jobs, timestamp: serverTimestamp }));
                    } catch {}
                }
            }
        } catch {}

        // Return-visit notification
        try {
            const lastVisit = localStorage.getItem('midas_last_visit');
            const now = Date.now();
            if (lastVisit) {
                const daysSince = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
                if (daysSince >= 2) set({ showReturnNotification: true });
            }
            localStorage.setItem('midas_last_visit', now.toString());
        } catch {}
    },

    // Persist preferences
    persistPreferences: () => {
        const { preferences } = get();
        if (preferences.location || preferences.remoteOnly) {
            try { localStorage.setItem('midas_preferences', JSON.stringify(preferences)); } catch {}
        }
    },

    // Persist job results
    persistJobs: () => {
        const { jobs, isMatching } = get();
        if (jobs.length > 0 && !isMatching) {
            try { localStorage.setItem('midas_results', JSON.stringify({ jobs, timestamp: Date.now() })); }
            catch {}
        }
    },
}));
