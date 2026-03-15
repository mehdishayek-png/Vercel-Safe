'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getAllCountries, getStatesByCountry, getCitiesByState, getCountryName } from '../lib/location-data';
import { Country, State, City } from 'country-state-city';
import { useFilters } from '../hooks/use-filters';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const { isSignedIn } = useAuth();

    // Profile
    const [profile, setProfile] = useState(null);
    const [experienceYears, setExperienceYears] = useState(0);
    const [jobTitle, setJobTitle] = useState('');

    // Jobs
    const [jobs, setJobs] = useState([]);
    const [isMatching, setIsMatching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [logs, setLogs] = useState([]);
    const [deepAnalysisProgress, setDeepAnalysisProgress] = useState(null);
    const [sortBy, setSortBy] = useState('score');

    // Saved & Applied
    const [savedJobIds, setSavedJobIds] = useState(new Set());
    const [savedJobsData, setSavedJobsData] = useState([]);
    const [appliedJobIds, setAppliedJobIds] = useState(new Set());
    const [appliedJobsData, setAppliedJobsData] = useState([]);

    // Tokens
    const [tokenBalance, setTokenBalance] = useState(0);
    const [dailyScanCount, setDailyScanCount] = useState(0);
    const [weeklyMidasScanCount, setWeeklyMidasScanCount] = useState(0);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [tokensLoading, setTokensLoading] = useState(true);
    const FREE_DAILY_SCANS = 5;
    const FREE_VISIBLE_JOBS = 100;

    // Search settings
    const [midasSearch, setMidasSearch] = useState(false);
    const [exploreAdjacent, setExploreAdjacent] = useState(false);
    const [preferences, setPreferences] = useState({ country: 'US', state: '', city: '', remoteOnly: false });

    // Location data
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    // UI state
    const [activeTab, setActiveTab] = useState('matches');
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef(null);

    // API keys
    const [apiKeys, setApiKeys] = useState({});

    // Filters
    const filtersHook = useFilters();

    // Notification
    const [showReturnNotification, setShowReturnNotification] = useState(false);

    // Recommendations
    const [recommendations, setRecommendations] = useState([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    const [recsError, setRecsError] = useState(null);
    const [recsLastFetched, setRecsLastFetched] = useState(null);

    const fetchRecommendations = useCallback(async (force = false) => {
        if (!profile || !profile.skills || profile.skills.length === 0) return;
        if (isLoadingRecs) return;

        // Don't re-fetch if we have recent recs (< 30 min) unless forced
        if (!force && recsLastFetched && (Date.now() - recsLastFetched) < 30 * 60 * 1000) return;

        // Check localStorage cache first
        if (!force) {
            try {
                const cached = localStorage.getItem('midas_recommendations');
                if (cached) {
                    const { recs, timestamp } = JSON.parse(cached);
                    const ageMin = (Date.now() - timestamp) / 1000 / 60;
                    if (ageMin < 30 && recs.length > 0) {
                        setRecommendations(recs);
                        setRecsLastFetched(timestamp);
                        return;
                    }
                }
            } catch {}
        }

        setIsLoadingRecs(true);
        setRecsError(null);

        try {
            // Build seen URLs from current jobs + saved + applied
            const seenJobUrls = [
                ...jobs.map(j => j.apply_url),
                ...savedJobsData.map(j => j.apply_url),
                ...appliedJobsData.map(j => j.apply_url),
            ].filter(Boolean);

            const res = await fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile,
                    savedJobs: savedJobsData,
                    appliedJobs: appliedJobsData,
                    preferences,
                    apiKeys,
                    seenJobUrls,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to fetch recommendations');
            }

            const data = await res.json();
            const recs = data.recommendations || [];
            setRecommendations(recs);
            setRecsLastFetched(Date.now());

            // Cache recommendations
            try {
                localStorage.setItem('midas_recommendations', JSON.stringify({
                    recs,
                    timestamp: Date.now(),
                }));
            } catch {}
        } catch (err) {
            setRecsError(err.message);
        } finally {
            setIsLoadingRecs(false);
        }
    }, [profile, savedJobsData, appliedJobsData, jobs, preferences, apiKeys, isLoadingRecs, recsLastFetched]);

    const refreshTokens = useCallback(async () => {
        try {
            const res = await fetch('/api/tokens');
            const data = await res.json();
            if (data.source !== 'anonymous' && data.source !== 'local') {
                setTokenBalance(data.tokens);
                setDailyScanCount(data.dailyScansUsed);
                setWeeklyMidasScanCount(data.weeklyMidasScansUsed || 0);
                if (data.isAdmin) setIsAdminUser(true);
                localStorage.setItem('midas_tokens', data.tokens.toString());
            } else {
                setTokenBalance(parseInt(localStorage.getItem('midas_tokens') || '0', 10));
            }
        } catch {
            setTokenBalance(parseInt(localStorage.getItem('midas_tokens') || '0', 10));
        } finally {
            setTokensLoading(false);
        }
    }, []);

    const addLog = useCallback((msg) => {
        setLogs(prev => [...prev, {
            message: msg,
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
        }]);
    }, []);

    // Toggle save
    const toggleSaveJob = useCallback((job) => {
        const jobId = job.apply_url;
        setSavedJobIds(prev => {
            const next = new Set(prev);
            if (next.has(jobId)) next.delete(jobId);
            else next.add(jobId);
            return next;
        });
        setSavedJobsData(prev => {
            const isSaving = !savedJobIds.has(jobId);
            let next;
            if (isSaving) {
                next = [...prev, job];
            } else {
                next = prev.filter(j => j.apply_url !== jobId);
            }
            localStorage.setItem('midas_saved_jobs', JSON.stringify(next.map(j => j.apply_url)));
            localStorage.setItem('midas_saved_jobs_data', JSON.stringify(next));
            return next;
        });
        const isSaving = !savedJobIds.has(jobId);
        fetch('/api/saved-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job, action: isSaving ? 'save' : 'unsave' }),
        }).catch(() => {});
    }, [savedJobIds]);

    // Toggle applied
    const toggleAppliedJob = useCallback((job) => {
        const jobId = job.apply_url;
        setAppliedJobIds(prev => {
            const next = new Set(prev);
            if (next.has(jobId)) next.delete(jobId);
            else next.add(jobId);
            return next;
        });
        setAppliedJobsData(prev => {
            const isApplying = !appliedJobIds.has(jobId);
            let next;
            if (isApplying) {
                next = [...prev, { ...job, applied_at: new Date().toISOString() }];
            } else {
                next = prev.filter(j => j.apply_url !== jobId);
            }
            localStorage.setItem('midas_applied_jobs', JSON.stringify(next.map(j => j.apply_url)));
            localStorage.setItem('midas_applied_jobs_data', JSON.stringify(next));
            return next;
        });
        // Sync to server
        const isApplying = !appliedJobIds.has(jobId);
        fetch('/api/saved-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job, action: isApplying ? 'apply' : 'unapply', type: 'applied' }),
        }).catch(() => {});
    }, [appliedJobIds]);

    // Initialize on mount
    useEffect(() => {
        refreshTokens();

        // Load countries
        try {
            const data = getAllCountries();
            if (data && Array.isArray(data)) setCountries(data);
        } catch (err) { console.error("Failed to load countries:", err); }

        // Load API keys
        try {
            const stored = localStorage.getItem('midas_keys');
            if (stored) setApiKeys(JSON.parse(stored));
        } catch {}

        // Load saved jobs
        (async () => {
            try {
                const res = await fetch('/api/saved-jobs');
                if (res.ok) {
                    const data = await res.json();
                    if (data.source === 'server' && data.jobs.length > 0) {
                        setSavedJobsData(data.jobs);
                        setSavedJobIds(new Set(data.jobs.map(j => j.apply_url)));
                        localStorage.setItem('midas_saved_jobs', JSON.stringify(data.jobs.map(j => j.apply_url)));
                        localStorage.setItem('midas_saved_jobs_data', JSON.stringify(data.jobs));
                        return;
                    }
                }
            } catch {}
            try {
                const saved = localStorage.getItem('midas_saved_jobs');
                if (saved) setSavedJobIds(new Set(JSON.parse(saved)));
                const savedData = localStorage.getItem('midas_saved_jobs_data');
                if (savedData) setSavedJobsData(JSON.parse(savedData));
            } catch { setSavedJobIds(new Set()); setSavedJobsData([]); }
        })();

        // Load applied jobs from localStorage
        try {
            const applied = localStorage.getItem('midas_applied_jobs');
            if (applied) setAppliedJobIds(new Set(JSON.parse(applied)));
            const appliedData = localStorage.getItem('midas_applied_jobs_data');
            if (appliedData) setAppliedJobsData(JSON.parse(appliedData));
        } catch { setAppliedJobIds(new Set()); setAppliedJobsData([]); }

        // Load profile
        try {
            const storedProfile = localStorage.getItem('midas_profile');
            if (storedProfile) {
                const parsed = JSON.parse(storedProfile);
                setProfile(parsed);
                if (parsed.experience_years) setExperienceYears(parsed.experience_years);
                if (parsed.headline) setJobTitle(parsed.headline);
            }
        } catch {}

        // Load cached results
        try {
            const storedResults = localStorage.getItem('midas_results');
            if (storedResults) {
                const { jobs: savedJobs, timestamp } = JSON.parse(storedResults);
                const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;
                if (ageInMinutes < 60) {
                    setJobs(savedJobs);
                } else {
                    localStorage.removeItem('midas_results');
                }
            }
        } catch {}

        // Return-visit notification: show if last visit was 2+ days ago
        try {
            const lastVisit = localStorage.getItem('midas_last_visit');
            const now = Date.now();
            if (lastVisit) {
                const daysSince = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
                if (daysSince >= 2) {
                    setShowReturnNotification(true);
                }
            }
            localStorage.setItem('midas_last_visit', now.toString());
        } catch {}
    }, []);

    // Persist profile changes
    useEffect(() => {
        if (profile) {
            try {
                const profileToSave = { ...profile, experience_years: experienceYears, headline: jobTitle };
                localStorage.setItem('midas_profile', JSON.stringify(profileToSave));
            } catch {}
        }
    }, [profile, experienceYears, jobTitle]);

    // Persist job results
    useEffect(() => {
        if (jobs.length > 0 && !isMatching) {
            try { localStorage.setItem('midas_results', JSON.stringify({ jobs, timestamp: Date.now() })); }
            catch {}
        }
    }, [jobs, isMatching]);

    // Location cascading
    useEffect(() => {
        if (preferences.country) {
            const countryStates = getStatesByCountry(preferences.country);
            setStates(countryStates);
            if (countryStates.length === 0) setCities(getCitiesByState(preferences.country, null));
            else setCities([]);
            setPreferences(prev => ({ ...prev, state: '', city: '' }));
        } else { setStates([]); setCities([]); }
    }, [preferences.country]);

    useEffect(() => {
        if (preferences.state) {
            setCities(getCitiesByState(preferences.country, preferences.state));
            setPreferences(prev => ({ ...prev, city: '' }));
        }
    }, [preferences.state]);

    const freeScansRemaining = Math.max(0, FREE_DAILY_SCANS - dailyScanCount);

    const value = {
        // Profile
        profile, setProfile,
        experienceYears, setExperienceYears,
        jobTitle, setJobTitle,
        isParsing, setIsParsing,
        fileInputRef,
        apiKeys, setApiKeys,

        // Jobs
        jobs, setJobs,
        isMatching, setIsMatching,
        searchError, setSearchError,
        logs, setLogs, addLog,
        deepAnalysisProgress, setDeepAnalysisProgress,
        sortBy, setSortBy,
        activeTab, setActiveTab,

        // Saved & Applied
        savedJobIds, setSavedJobIds,
        savedJobsData, setSavedJobsData,
        toggleSaveJob,
        appliedJobIds, setAppliedJobIds,
        appliedJobsData, setAppliedJobsData,
        toggleAppliedJob,

        // Tokens
        tokenBalance, setTokenBalance,
        dailyScanCount,
        weeklyMidasScanCount,
        isAdminUser,
        tokensLoading,
        refreshTokens,
        freeScansRemaining,
        FREE_DAILY_SCANS,
        FREE_VISIBLE_JOBS,

        // Search settings
        midasSearch, setMidasSearch,
        exploreAdjacent, setExploreAdjacent,
        preferences, setPreferences,
        countries, states, cities,

        // Filters
        ...filtersHook,

        // Auth
        isSignedIn,

        // Notifications
        showReturnNotification, setShowReturnNotification,

        // Recommendations
        recommendations, setRecommendations,
        isLoadingRecs,
        recsError,
        fetchRecommendations,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
