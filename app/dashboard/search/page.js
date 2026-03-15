'use client';
import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ChevronDown, Sparkles } from 'lucide-react';
import { FilterPanel } from '@/components/FilterPanel';
import { MatchResultsGrid } from '@/components/MatchResultsGrid';
import { OnboardingPanel } from '@/components/dashboard/OnboardingPanel';
import { CandidatePanel } from '@/components/dashboard/CandidatePanel';
import { ScanControls } from '@/components/dashboard/ScanControls';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { getCountryName } from '@/lib/location-data';
import { Country, State, City } from 'country-state-city';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';

export default function SearchPage() {
    const app = useApp();
    const toast = useToast();
    const resultsRef = useRef(null);

    const [newSkill, setNewSkill] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [readinessOpen, setReadinessOpen] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    const {
        profile, setProfile,
        jobs, setJobs,
        isParsing, setIsParsing,
        isMatching, setIsMatching,
        searchError, setSearchError,
        logs, setLogs, addLog,
        savedJobIds,
        savedJobsData,
        activeTab, setActiveTab,
        sortBy, setSortBy,
        deepAnalysisProgress, setDeepAnalysisProgress,
        tokenBalance, dailyScanCount, weeklyMidasScanCount,
        isAdminUser, tokensLoading,
        midasSearch, setMidasSearch,
        exploreAdjacent, setExploreAdjacent,
        preferences, setPreferences,
        countries, states, cities,
        experienceYears, setExperienceYears,
        jobTitle, setJobTitle,
        fileInputRef, apiKeys,
        toggleSaveJob, toggleAppliedJob,
        appliedJobIds,
        refreshTokens,
        freeScansRemaining,
        FREE_DAILY_SCANS, FREE_VISIBLE_JOBS,
        isSignedIn,
        // Filters
        filters, flags,
        isActive: filtersActive, activeCount: filterCount, summary: filterSummary,
        toggleWorkArrangement, toggleWorkType, toggleRegion, toggleCompanySize,
        setSalaryMin, setSalaryCurrency, setIncludeMissingSalary, reset: resetFilters,
    } = app;

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsParsing(true);
        addLog("Parsing resume...");
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/parse-resume', { method: 'POST', body: formData });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to parse resume (${res.status})`);
            }
            const data = await res.json();
            setProfile(data.profile);
            if (typeof data.profile.experience_years === 'number') setExperienceYears(data.profile.experience_years);
            if (data.profile.headline) setJobTitle(data.profile.headline);

            if (data.profile.location) {
                addLog(`Detected location: ${data.profile.location}`);
                const locLower = data.profile.location.toLowerCase();
                const allCountries = Country.getAllCountries();
                const foundCountry = allCountries.find(c =>
                    locLower.includes(c.name.toLowerCase()) || locLower.includes(c.isoCode.toLowerCase()) ||
                    (c.isoCode === 'US' && locLower.includes('usa')) || (c.isoCode === 'GB' && locLower.includes('uk'))
                );
                if (foundCountry) {
                    let matchedState = '';
                    let matchedCity = '';
                    const countryStates = State.getStatesOfCountry(foundCountry.isoCode);
                    const foundState = countryStates.find(s =>
                        locLower.includes(s.name.toLowerCase()) || new RegExp(`\\b${s.isoCode.toLowerCase()}\\b`).test(locLower)
                    );
                    if (foundState) {
                        matchedState = foundState.isoCode;
                        const stateCities = City.getCitiesOfState(foundCountry.isoCode, matchedState);
                        const foundCity = stateCities.find(c => locLower.includes(c.name.toLowerCase()));
                        if (foundCity) matchedCity = foundCity.name;
                    } else {
                        const countryCities = City.getCitiesOfCountry(foundCountry.isoCode);
                        const foundCity = countryCities.find(c => locLower.includes(c.name.toLowerCase()));
                        if (foundCity) matchedCity = foundCity.name;
                    }
                    setPreferences(prev => ({ ...prev, country: foundCountry.isoCode, state: matchedState, city: matchedCity }));
                    addLog(`Mapped to ${foundCountry.name}`);
                }
            }
            addLog(`Profile extracted for ${data.profile.name}`);
        } catch (err) {
            const msg = err.message.toLowerCase();
            let userMessage;
            if (msg.includes('pdf') || msg.includes('parse')) userMessage = "Couldn't read this PDF. Try a simpler format or paste info manually.";
            else if (msg.includes('network') || msg.includes('fetch')) userMessage = 'Network error. Check your connection.';
            else userMessage = `Upload failed: ${err.message}`;
            addLog(`Warning: ${userMessage}`);
            setSearchError({ type: 'resume', message: userMessage });
        } finally {
            setIsParsing(false);
        }
    };

    const handleAddSkill = () => {
        if (!newSkill.trim() || !profile) return;
        if (profile.skills.includes(newSkill.trim())) { setNewSkill(''); return; }
        setProfile(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
        setNewSkill('');
    };

    const handleRemoveSkill = (skillToRemove) => {
        if (!profile) return;
        setProfile(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillToRemove) }));
    };

    const findJobs = async () => {
        if (!profile) return;
        setIsMatching(true);
        setJobs([]);
        setLogs([]);
        setSearchError(null);
        addLog("Starting job search agent...");
        addLog("Streaming results as sources respond...");
        setActiveTab('matches');

        const isFreeScan = !midasSearch && dailyScanCount < FREE_DAILY_SCANS;
        if (!isFreeScan && !midasSearch && tokenBalance <= 0 && !isAdminUser) {
            setSearchError('Free daily scans used. Purchase tokens to continue.');
            setIsMatching(false);
            return;
        }

        let locationQuery = '';
        if (!preferences.remoteOnly) {
            const countryName = getCountryName(preferences.country);
            const queryParts = [];
            if (preferences.city) queryParts.push(preferences.city);
            else if (preferences.state) queryParts.push(preferences.state);
            queryParts.push(countryName);
            locationQuery = queryParts.join(', ');
        }

        try {
            // Use streaming endpoint — results populate as each source completes
            const res = await fetch('/api/match-jobs-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: { ...profile, experience_years: experienceYears, headline: jobTitle },
                    apiKeys,
                    preferences: { ...preferences, location: locationQuery, midasSearch, filters, exploreAdjacent }
                })
            });

            // Handle non-streaming error responses (auth, rate-limit, validation)
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 429) throw new Error(errData.error || 'Rate limit reached.');
                if (res.status === 401 && errData.requiresAuth) { setSearchError('Sign in to scan for jobs.'); setIsMatching(false); return; }
                if (res.status === 403) { setSearchError(errData.error || 'No tokens remaining.'); setIsMatching(false); return; }
                throw new Error(errData.error || 'Failed to fetch jobs');
            }

            // Consume SSE stream — populate results progressively
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            const seenUrls = new Set();
            let totalSourceJobs = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const event = JSON.parse(line.slice(6));

                        if (event.type === 'progress') {
                            addLog(event.message);
                        } else if (event.type === 'jobs') {
                            // Deduplicate against already-displayed jobs
                            const newJobs = (event.jobs || []).filter(j => {
                                if (!j.apply_url || seenUrls.has(j.apply_url)) return false;
                                seenUrls.add(j.apply_url);
                                return true;
                            }).map(j => ({
                                ...j,
                                match_score: j.pandaScore?.score ?? j.match_score ?? 0,
                                heuristic_breakdown: j.pandaScore || j.heuristic_breakdown,
                            })).filter(j => j.match_score >= 20); // Basic threshold

                            if (newJobs.length > 0) {
                                totalSourceJobs += newJobs.length;
                                addLog(`+${newJobs.length} from ${event.source} (${totalSourceJobs} total)`);
                                // Merge and sort by score
                                setJobs(prev => {
                                    const merged = [...prev, ...newJobs];
                                    return merged.sort((a, b) =>
                                        (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0)
                                    );
                                });
                            }
                        } else if (event.type === 'complete') {
                            addLog(`Search complete: ${event.totalUnique} unique jobs from ${Object.keys(event.sources || {}).length} sources`);
                        } else if (event.type === 'error') {
                            addLog(`Warning: ${event.message}`);
                        }
                    } catch { /* skip malformed SSE lines */ }
                }
            }

            // Deep analysis on top results (after streaming is complete)
            setJobs(currentJobs => {
                if (currentJobs.length === 0) {
                    setSearchError('No matching jobs found. Try broadening your search.');
                    return currentJobs;
                }

                const top20 = currentJobs.slice(0, 20);
                const totalBatches = Math.ceil(top20.length / 4);
                addLog(`AI Agent: Deep analysis on top ${top20.length} candidates...`);
                setDeepAnalysisProgress({ current: 0, total: totalBatches });

                // Run deep analysis asynchronously
                (async () => {
                    const chunkSize = 4;
                    const updateJobWithAnalysis = (jobId, analysis) => {
                        setJobs(prev => prev.map(j => {
                            if (j.id === jobId || j.apply_url === jobId) return { ...j, analysis, match_score: analysis.fit_score || j.match_score };
                            return j;
                        }).filter(j => !(j.analysis?.fit_score && j.analysis.fit_score < 35)));
                    };

                    for (let i = 0; i < top20.length; i += chunkSize) {
                        const chunk = top20.slice(i, i + chunkSize);
                        const batchNum = Math.floor(i / chunkSize) + 1;
                        addLog(`Batch ${batchNum}/${totalBatches}...`);
                        setDeepAnalysisProgress({ current: batchNum, total: totalBatches });

                        const promises = chunk.map(job =>
                            fetch('/api/analyze-job', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    job, profile: { ...profile, experience_years: experienceYears, headline: jobTitle }, apiKeys
                                })
                            }).then(r => r.json()).then(d => {
                                if (d.analysis) updateJobWithAnalysis(job.id || job.apply_url, d.analysis);
                            }).catch(err => console.error(`Failed to analyze ${job.title}`, err))
                        );
                        await Promise.all(promises);
                    }

                    setJobs(prev => [...prev].sort((a, b) =>
                        (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0)
                    ));
                    setDeepAnalysisProgress(null);
                    addLog("Analysis complete. Sorted by fit score.");
                    refreshTokens();
                })();

                return currentJobs;
            });

            refreshTokens();
        } catch (err) {
            const hasPartial = jobs.length > 0;
            const userMessage = hasPartial
                ? `Partial failure: ${err.message}. Showing ${jobs.length} results.`
                : `Search failed: ${err.message}`;
            addLog(`Warning: ${userMessage}`);
            setSearchError({ type: 'search', message: userMessage, canRetry: true });
        } finally {
            setIsMatching(false);
        }
    };

    const isPaywalled = !isAdminUser && tokenBalance <= 0;

    const displayedJobs = (() => {
        let list = activeTab === 'saved' ? savedJobsData : [...jobs];
        if (sortBy === 'latest') {
            list.sort((a, b) => {
                const parseDate = (d) => {
                    if (!d) return 0;
                    const parsed = new Date(d);
                    if (!isNaN(parsed)) return parsed.getTime();
                    const rel = String(d).match(/(\d+)\s*(day|hour|minute|week|month)/i);
                    if (rel) {
                        const units = { minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
                        return Date.now() - (parseInt(rel[1]) * (units[rel[2].toLowerCase()] || 86400000));
                    }
                    return 0;
                };
                return parseDate(b.date_posted || b.posted_date) - parseDate(a.date_posted || a.posted_date);
            });
        } else {
            const indexed = list.map((item, index) => ({ item, index }));
            indexed.sort((A, B) => {
                const diff = (B.item.analysis?.fit_score || B.item.match_score || 0) - (A.item.analysis?.fit_score || A.item.match_score || 0);
                return diff !== 0 ? diff : A.index - B.index;
            });
            list = indexed.map(x => x.item);
        }
        return list;
    })();

    const readinessChecks = profile ? [
        { label: "Identity & Targets", passed: !!(profile.name && jobTitle), points: 20 },
        { label: "Skills Parsed", passed: profile.skills?.length > 0, points: 20 },
        { label: "5+ Skills", passed: profile.skills?.length >= 5, points: 20 },
        { label: "Experience Set", passed: true, points: 20 },
        { label: "Ready to Scan", passed: true, points: 20 },
    ] : [];
    const readinessScore = readinessChecks.reduce((acc, c) => c.passed ? acc + c.points : acc, 0);

    return (
        <div className="flex gap-6 max-w-[1280px] w-full search-bg rounded-2xl p-5 -m-5 min-h-[calc(100vh-100px)]">
            {/* Left Panel */}
            <div className="w-[380px] shrink-0 space-y-4 relative z-10">
                {/* Privacy */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 p-2 px-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Resumes processed in-memory only. Never stored or used for training.
                </div>

                {/* Profile Readiness */}
                {profile && (
                    <button
                        onClick={() => setReadinessOpen(!readinessOpen)}
                        className="w-full flex items-center justify-between p-2.5 px-3.5 bg-white rounded-xl border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                            <span className="text-[13px] font-semibold text-gray-900">Profile Ready</span>
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{readinessScore}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${readinessOpen ? 'rotate-180' : ''}`} />
                    </button>
                )}

                {readinessOpen && profile && (
                    <div className="bg-white rounded-xl border border-surface-200 p-3 -mt-2 space-y-1">
                        {readinessChecks.map((check, i) => (
                            <div key={i} className="flex items-center justify-between py-1 text-[13px] text-gray-600">
                                <div className="flex items-center gap-2">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={check.passed ? '#059669' : '#d1d5db'} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                    {check.label}
                                </div>
                                {check.passed && <span className="text-[10px] text-emerald-500 font-semibold">+{check.points}</span>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Resume Upload & Onboarding */}
                {!profile && (
                    <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} />
                )}

                {profile && (
                    <>
                        <CandidatePanel
                            profile={profile} jobTitle={jobTitle} setJobTitle={setJobTitle}
                            isEditingTitle={isEditingTitle} setIsEditingTitle={setIsEditingTitle}
                            newSkill={newSkill} setNewSkill={setNewSkill}
                            handleAddSkill={handleAddSkill} handleRemoveSkill={handleRemoveSkill}
                        />

                        <ScanControls
                            experienceYears={experienceYears} setExperienceYears={setExperienceYears}
                            preferences={preferences} setPreferences={setPreferences}
                            countries={countries} states={states} cities={cities}
                            exploreAdjacent={exploreAdjacent} setExploreAdjacent={setExploreAdjacent}
                            midasSearch={midasSearch} setMidasSearch={setMidasSearch}
                            tokensLoading={tokensLoading} tokenBalance={tokenBalance}
                            weeklyMidasScanCount={weeklyMidasScanCount} isAdminUser={isAdminUser}
                            isMatching={isMatching} isSignedIn={isSignedIn}
                            freeScansRemaining={freeScansRemaining}
                            findJobs={findJobs} onReset={() => setProfile(null)}
                        />

                        <FilterPanel
                            filters={filters} flags={flags} isActive={filtersActive} activeCount={filterCount} summary={filterSummary}
                            toggleWorkArrangement={toggleWorkArrangement} toggleWorkType={toggleWorkType} toggleRegion={toggleRegion} toggleCompanySize={toggleCompanySize}
                            setSalaryMin={setSalaryMin} setSalaryCurrency={setSalaryCurrency} setIncludeMissingSalary={setIncludeMissingSalary} reset={resetFilters}
                        />
                    </>
                )}

                {/* Activity Log */}
                <ActivityLog logs={logs} />
            </div>

            {/* Right Panel — Results */}
            <div className="flex-1 min-w-0 relative z-10" ref={resultsRef}>
                <MatchResultsGrid
                    jobs={jobs} activeTab={activeTab} setActiveTab={setActiveTab} sortBy={sortBy} setSortBy={setSortBy}
                    displayedJobs={displayedJobs} isMatching={isMatching} searchError={searchError} setSearchError={setSearchError}
                    deepAnalysisProgress={deepAnalysisProgress} savedJobIds={savedJobIds} profile={profile} apiKeys={apiKeys}
                    toggleSaveJob={toggleSaveJob} toggleAppliedJob={toggleAppliedJob} appliedJobIds={appliedJobIds}
                    refreshTokens={refreshTokens} isPaywalled={isPaywalled}
                    findJobs={findJobs} freeVisibleJobs={FREE_VISIBLE_JOBS}
                />
            </div>

            {/* Loading Toast */}
            <AnimatePresence>
                {isMatching && (
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-white border border-surface-200 rounded-xl px-5 py-3 shadow-elevated max-w-sm w-[85vw]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin" />
                                <Sparkles className="w-3 h-3 text-brand-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900">
                                    {deepAnalysisProgress ? 'AI Deep Analysis...' : 'Scanning...'}
                                </div>
                                <div className="text-[11px] text-gray-400 truncate">
                                    {deepAnalysisProgress
                                        ? `Batch ${deepAnalysisProgress.current}/${deepAnalysisProgress.total}`
                                        : logs.length > 0 ? logs[logs.length - 1].message : 'Initializing...'}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
