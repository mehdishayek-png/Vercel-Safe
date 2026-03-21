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
    const streamJobCountRef = useRef(0);

    const [newSkill, setNewSkill] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [readinessOpen, setReadinessOpen] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [whatIDoOpen, setWhatIDoOpen] = useState(false);

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
        whatIDo, setWhatIDo,
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

    const [searchSuggestions, setSearchSuggestions] = useState(null);

    const generateSearchSuggestions = async (currentTitle, currentProfile) => {
        try {
            const res = await fetch('/api/search-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: currentTitle, skills: currentProfile?.skills || [] }),
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.suggestions || null;
        } catch { return null; }
    };

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
            // Clear previous job results — new resume = new matches
            setJobs([]);
            try { localStorage.removeItem('midas_results'); } catch {}

            // Clear any previous error (e.g. from a prior failed upload)
            setSearchError(null);

            setProfile(data.profile);
            if (typeof data.profile.experience_years === 'number') setExperienceYears(data.profile.experience_years);
            if (data.profile.headline) setJobTitle(data.profile.headline);
            if (data.whatIDo) setWhatIDo(data.whatIDo);

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
        streamJobCountRef.current = 0;
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
                    profile: { ...profile, experience_years: experienceYears, headline: jobTitle, whatIDo },
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
            // Seed with existing job URLs to avoid duplicates across scans
            const seenUrls = new Set(jobs.map(j => j.apply_url).filter(Boolean));
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
                            })).filter(j => j.match_score >= 30); // Quality threshold — hide heavily-penalized results

                            if (newJobs.length > 0) {
                                totalSourceJobs += newJobs.length;
                                streamJobCountRef.current = totalSourceJobs;
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

            // Clear previous suggestions
            setSearchSuggestions(null);

            // Deep analysis on top results (after streaming is complete)
            setJobs(currentJobs => {
                if (currentJobs.length === 0) {
                    setSearchError('No matching jobs found. Try broadening your search.');
                    return currentJobs;
                }

                // Generate smart suggestions if results are sparse
                if (currentJobs.length < 15) {
                    generateSearchSuggestions(jobTitle, profile).then(s => s && setSearchSuggestions(s)).catch(() => {});
                }

                // Mark top 20 as pending analysis — hides heuristic score until AI score arrives
                const top20 = currentJobs.slice(0, 20);
                const top20Ids = new Set(top20.map(j => j.id || j.apply_url));
                const markedJobs = currentJobs.map(j =>
                    top20Ids.has(j.id || j.apply_url) ? { ...j, _pendingAnalysis: true } : j
                );

                const chunkSize = 10;
                const totalBatches = Math.ceil(top20.length / chunkSize);
                addLog(`AI Agent: Deep analysis on top ${top20.length} candidates...`);
                setDeepAnalysisProgress({ current: 0, total: totalBatches });

                // Run deep analysis asynchronously
                (async () => {
                    const updateJobWithAnalysis = (jobId, analysis) => {
                        setJobs(prev => prev.map(j => {
                            if (j.id === jobId || j.apply_url === jobId) {
                                return { ...j, analysis, match_score: analysis.fit_score || j.match_score, _pendingAnalysis: false };
                            }
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
                                    job, profile: { ...profile, experience_years: experienceYears, headline: jobTitle, whatIDo }
                                })
                            }).then(r => r.json()).then(d => {
                                if (d.analysis) updateJobWithAnalysis(job.id || job.apply_url, d.analysis);
                            }).catch(err => console.error(`Failed to analyze ${job.title}`, err))
                        );
                        await Promise.all(promises);
                    }

                    // Clear pending flags (in case some analyses failed) and sort by final score
                    setJobs(prev => [...prev].map(j => ({ ...j, _pendingAnalysis: false })).sort((a, b) =>
                        (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0)
                    ));
                    setDeepAnalysisProgress(null);
                    addLog("Analysis complete. Sorted by fit score.");
                    refreshTokens();
                })();

                return markedJobs;
            });

            refreshTokens();
        } catch (err) {
            const hasPartial = streamJobCountRef.current > 0;
            const userMessage = hasPartial
                ? `Partial failure: ${err.message}. Showing ${streamJobCountRef.current} results.`
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

    const neuralProfile = app.neuralProfile;
    const ecosystemScore = neuralProfile?.ecosystemScore || 0;

    // Compute skill gaps from top saved jobs
    const topSkillGaps = (() => {
        if (!profile?.skills || savedJobsData.length === 0) return [];
        const allJobSkills = new Set();
        savedJobsData.slice(0, 5).forEach(j => {
            const desc = (j.description || j.summary || '').toLowerCase();
            const common = ['python', 'javascript', 'typescript', 'react', 'node.js', 'aws', 'docker', 'kubernetes', 'sql', 'graphql', 'rust', 'go', 'java', 'c++', 'terraform', 'ci/cd', 'agile', 'scrum', 'figma', 'tableau', 'power bi', 'machine learning', 'deep learning', 'nlp', 'data engineering', 'microservices', 'redis', 'kafka', 'elasticsearch'];
            common.forEach(s => { if (desc.includes(s)) allJobSkills.add(s); });
        });
        const userSkills = new Set(profile.skills.map(s => s.toLowerCase()));
        return [...allJobSkills].filter(s => !userSkills.has(s)).slice(0, 4);
    })();

    // Market momentum from job data
    const marketTrends = (() => {
        if (jobs.length === 0) return [];
        const sources = {};
        jobs.forEach(j => { const s = j.source || 'Other'; sources[s] = (sources[s] || 0) + 1; });
        return Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({
            name, count, trend: count > 10 ? 'up' : 'stable'
        }));
    })();

    return (
        <div className="max-w-[1400px] w-full -m-3 md:-m-5 p-4 md:p-6 min-h-[calc(100vh-100px)]">
            {/* Top Bar — Profile Controls (collapsible) */}
            <div className="mb-6">
                {!profile ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 p-2.5 px-3.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            Resumes processed in-memory only. Never stored or used for training.
                        </div>
                        <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Compact profile bar */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 min-w-0">
                                <CandidatePanel
                                    profile={profile} jobTitle={jobTitle} setJobTitle={setJobTitle}
                                    isEditingTitle={isEditingTitle} setIsEditingTitle={setIsEditingTitle}
                                    newSkill={newSkill} setNewSkill={setNewSkill}
                                    handleAddSkill={handleAddSkill} handleRemoveSkill={handleRemoveSkill}
                                />
                            </div>
                            <div className="lg:w-[420px] shrink-0">
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
                                    findJobs={findJobs} onReset={() => { setProfile(null); }}
                                />
                            </div>
                        </div>

                        {/* What I Do + Filters row */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setWhatIDoOpen(!whatIDoOpen)}
                                        className="w-full flex items-center justify-between p-3 px-4 cursor-pointer hover:bg-midas-surface-low/50 transition-colors"
                                    >
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] font-headline">
                                            What I Do
                                            <span className="text-slate-300 font-normal normal-case tracking-normal ml-1">(optional)</span>
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${whatIDoOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {whatIDoOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-3 space-y-2">
                                                    <textarea
                                                        value={whatIDo}
                                                        onChange={(e) => setWhatIDo(e.target.value)}
                                                        placeholder="Describe what you do day-to-day in 2-3 sentences..."
                                                        className="w-full text-[13px] text-gray-700 bg-midas-surface-low/50 border border-slate-200/60 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 placeholder:text-slate-300 dark:bg-[#22252f] dark:border-[#2d3140] dark:text-gray-200 dark:placeholder:text-gray-600"
                                                        rows={3}
                                                        maxLength={500}
                                                    />
                                                    <div className="text-[10px] text-slate-400 text-right">{whatIDo.length}/500</div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="lg:w-[420px] shrink-0">
                                <FilterPanel
                                    filters={filters} flags={flags} isActive={filtersActive} activeCount={filterCount} summary={filterSummary}
                                    toggleWorkArrangement={toggleWorkArrangement} toggleWorkType={toggleWorkType} toggleRegion={toggleRegion} toggleCompanySize={toggleCompanySize}
                                    setSalaryMin={setSalaryMin} setSalaryCurrency={setSalaryCurrency} setIncludeMissingSalary={setIncludeMissingSalary} reset={resetFilters}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content: Results + Intelligence Sidebar */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Center — Results */}
                <div className="flex-1 min-w-0 relative z-10" ref={resultsRef}>
                    <MatchResultsGrid
                        jobs={jobs} activeTab={activeTab} setActiveTab={setActiveTab} sortBy={sortBy} setSortBy={setSortBy}
                        displayedJobs={displayedJobs} isMatching={isMatching} searchError={searchError} setSearchError={setSearchError}
                        deepAnalysisProgress={deepAnalysisProgress} savedJobIds={savedJobIds} profile={profile} apiKeys={apiKeys}
                        toggleSaveJob={toggleSaveJob} toggleAppliedJob={toggleAppliedJob} appliedJobIds={appliedJobIds}
                        refreshTokens={refreshTokens} isPaywalled={isPaywalled}
                        findJobs={findJobs} freeVisibleJobs={FREE_VISIBLE_JOBS}
                        searchSuggestions={searchSuggestions} onSuggestionClick={(title) => { setJobTitle(title); setSearchSuggestions(null); }}
                    />
                </div>

                {/* Right Sidebar — Intelligence Widgets */}
                {profile && (
                    <div className="w-full lg:w-[320px] shrink-0 space-y-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
                        {/* Neural Profile Card */}
                        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-secondary-DEFAULT rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
                            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-lg" />
                            <div className="relative">
                                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/60">Neural Profile</span>
                                <div className="flex items-center justify-between mt-3">
                                    <div>
                                        <p className="text-4xl font-extrabold font-headline">{ecosystemScore || '—'}{ecosystemScore > 0 && <span className="text-lg text-white/60">%</span>}</p>
                                        <p className="text-[10px] text-white/60 font-bold tracking-wider uppercase mt-1">Ecosystem Sync</p>
                                    </div>
                                    {/* Circular indicator */}
                                    <div className="relative w-16 h-16">
                                        <svg width="64" height="64" className="-rotate-90">
                                            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                                            <circle cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="5"
                                                strokeDasharray={`${2 * Math.PI * 26}`}
                                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - (ecosystemScore || 0) / 100)}`}
                                                strokeLinecap="round" className="transition-all duration-700"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-white/80" />
                                        </div>
                                    </div>
                                </div>

                                {/* Profile stat bars */}
                                <div className="mt-5 space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-semibold text-white/70">Experience Depth</span>
                                            <span className="text-[10px] font-bold text-white/90">{Math.min(experienceYears * 8, 100)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                                            <div className="h-full bg-white/70 rounded-full transition-all duration-500" style={{ width: `${Math.min(experienceYears * 8, 100)}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-semibold text-white/70">Market Relevance</span>
                                            <span className="text-[10px] font-bold text-white/90">{jobs.length > 0 ? Math.min(Math.round(jobs.filter(j => (j.match_score || 0) >= 70).length / jobs.length * 100), 100) : 0}%</span>
                                        </div>
                                        <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                                            <div className="h-full bg-white/70 rounded-full transition-all duration-500" style={{ width: `${jobs.length > 0 ? Math.min(Math.round(jobs.filter(j => (j.match_score || 0) >= 70).length / jobs.length * 100), 100) : 0}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <a href="/dashboard/ai-refinement" className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Optimize My Profile
                                </a>
                            </div>
                        </div>

                        {/* Market Momentum */}
                        {marketTrends.length > 0 && (
                            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                                <h3 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-4">Market Momentum</h3>
                                <div className="space-y-3">
                                    {marketTrends.map((trend) => (
                                        <div key={trend.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${trend.trend === 'up' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{trend.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-gray-500">{trend.count} roles</span>
                                                {trend.trend === 'up' && (
                                                    <span className="text-[10px] font-bold text-emerald-500">HOT</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Skill Bridge Gaps */}
                        {topSkillGaps.length > 0 && (
                            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Skill Bridge</h3>
                                    <a href="/dashboard/skill-bridge" className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors">
                                        View All
                                    </a>
                                </div>
                                <div className="space-y-2.5">
                                    {topSkillGaps.map((skill) => (
                                        <div key={skill} className="flex items-center gap-2.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{skill}</span>
                                            <span className="ml-auto text-[9px] font-bold tracking-wider uppercase text-amber-500">GAP</span>
                                        </div>
                                    ))}
                                </div>
                                <a href="/dashboard/skill-bridge" className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-[#22252f] hover:bg-gray-200 dark:hover:bg-[#2d3140] rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer">
                                    Analyze Full Gap
                                </a>
                            </div>
                        )}

                        {/* Pipeline Quick Stats */}
                        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                            <h3 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-4">Pipeline</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-3 text-center">
                                    <p className="text-xl font-extrabold text-gray-900 dark:text-white font-headline">{savedJobIds.size}</p>
                                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Saved</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-3 text-center">
                                    <p className="text-xl font-extrabold text-gray-900 dark:text-white font-headline">{appliedJobIds?.size || 0}</p>
                                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Applied</p>
                                </div>
                            </div>
                            <a href="/dashboard/pipeline" className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors cursor-pointer">
                                View Pipeline
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Loading Toast */}
            <AnimatePresence>
                {isMatching && (
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-[#1a1d27]/90 backdrop-blur-xl border border-slate-200/60 dark:border-[#2d3140] rounded-2xl px-5 py-3.5 shadow-hero max-w-sm w-[85vw]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-full border-2 border-brand-100 border-t-brand-600 animate-spin" />
                                <Sparkles className="w-3 h-3 text-brand-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">
                                    {deepAnalysisProgress ? 'AI Deep Analysis...' : 'Scanning...'}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
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
