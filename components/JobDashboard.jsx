import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ChevronDown, Sparkles } from 'lucide-react';
import { Header } from './Header';
import { GuideModal } from './GuideModal';
import { FilterPanel } from './FilterPanel';
import { TokenSection } from './TokenSection';
import { MatchResultsGrid } from './MatchResultsGrid';
import { OnboardingPanel } from './dashboard/OnboardingPanel';
import { CandidatePanel } from './dashboard/CandidatePanel';
import { ScanControls } from './dashboard/ScanControls';
import { ActivityLog } from './dashboard/ActivityLog';
import { getAllCountries, getStatesByCountry, getCitiesByState, getCountryName } from '../lib/location-data';
import { Country, State, City } from 'country-state-city';
import { useRazorpay } from '../lib/useRazorpay';
import { useToast } from './ui/Toast';
import { useAuth } from '@clerk/nextjs';
import { useFilters } from '../hooks/use-filters';

export function JobDashboard({ apiKeys, onBack }) {
    const { isSignedIn } = useAuth();
    const [profile, setProfile] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [logs, setLogs] = useState([]);
    const [savedJobIds, setSavedJobIds] = useState(new Set());
    const [savedJobsData, setSavedJobsData] = useState([]);
    const [activeTab, setActiveTab] = useState('matches');
    const [showGuide, setShowGuide] = useState(false);
    const [sortBy, setSortBy] = useState('score');
    const [deepAnalysisProgress, setDeepAnalysisProgress] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const toast = useToast();

    const [tokenBalance, setTokenBalance] = useState(0);
    const [dailyScanCount, setDailyScanCount] = useState(0);
    const [weeklyMidasScanCount, setWeeklyMidasScanCount] = useState(0);
    const FREE_DAILY_SCANS = 5;
    const FREE_VISIBLE_JOBS = 100;
    const [midasSearch, setMidasSearch] = useState(false);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [tokensLoading, setTokensLoading] = useState(true);

    const [readinessOpen, setReadinessOpen] = useState(false);

    const {
        filters, flags,
        isActive: filtersActive, activeCount: filterCount, summary: filterSummary,
        toggleWorkArrangement, toggleWorkType, toggleRegion, toggleCompanySize,
        setSalaryMin, setSalaryCurrency, setIncludeMissingSalary, reset: resetFilters,
    } = useFilters();

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

    const { initiatePayment, isProcessing: isPaymentProcessing } = useRazorpay({
        onSuccess: async () => {
            await refreshTokens();
            toast('50 tokens credited!', 'success');
        },
        onError: (err) => toast(`Payment error: ${err.message}`, 'error')
    });

    const [preferences, setPreferences] = useState({ country: 'US', state: '', city: '', remoteOnly: false });
    const [newSkill, setNewSkill] = useState('');
    const [experienceYears, setExperienceYears] = useState(0);
    const [jobTitle, setJobTitle] = useState('');
    const [exploreAdjacent, setExploreAdjacent] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const resultsRef = useRef(null);

    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        refreshTokens();
        try {
            const data = getAllCountries();
            if (data && Array.isArray(data)) setCountries(data);
        } catch (err) { console.error("Failed to load countries:", err); }

        // Load saved jobs — try server first, fall back to localStorage
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
            } catch { /* fall through to localStorage */ }
            try {
                const saved = localStorage.getItem('midas_saved_jobs');
                if (saved) setSavedJobIds(new Set(JSON.parse(saved)));
                const savedData = localStorage.getItem('midas_saved_jobs_data');
                if (savedData) setSavedJobsData(JSON.parse(savedData));
            } catch (err) { console.error("Failed to load saved jobs:", err); setSavedJobIds(new Set()); setSavedJobsData([]); }
        })();

        try {
            const storedProfile = localStorage.getItem('midas_profile');
            if (storedProfile) {
                const parsed = JSON.parse(storedProfile);
                setProfile(parsed);
                if (parsed.experience_years) setExperienceYears(parsed.experience_years);
                if (parsed.headline) setJobTitle(parsed.headline);
            }
        } catch (err) { console.error("Failed to restore profile:", err); }

        try {
            const storedResults = localStorage.getItem('midas_results');
            if (storedResults) {
                const { jobs: savedJobs, timestamp } = JSON.parse(storedResults);
                const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;
                if (ageInMinutes < 60) {
                    setJobs(savedJobs);
                    addLog(`Restored ${savedJobs.length} jobs from last search (${Math.floor(ageInMinutes)} min ago)`);
                } else { localStorage.removeItem('midas_results'); }
            }
        } catch (err) { console.error("Failed to restore results:", err); }
    }, []);

    useEffect(() => {
        if (profile) {
            try {
                const profileToSave = { ...profile, experience_years: experienceYears, headline: jobTitle };
                localStorage.setItem('midas_profile', JSON.stringify(profileToSave));
            } catch (err) { console.error("Failed to save profile:", err); }
        }
    }, [profile, experienceYears, jobTitle]);

    useEffect(() => {
        if (jobs.length > 0 && !isMatching) {
            try { localStorage.setItem('midas_results', JSON.stringify({ jobs, timestamp: Date.now() })); }
            catch (err) { console.error("Failed to save results:", err); }
        }
    }, [jobs, isMatching]);

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

    const addLog = (msg) => {
        setLogs(prev => [...prev, {
            message: msg,
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
        }]);
    };

    const toggleSaveJob = (job) => {
        const newSavedIds = new Set(savedJobIds);
        const jobId = job.apply_url;
        let newSavedData = [...savedJobsData];
        const isSaving = !newSavedIds.has(jobId);
        if (isSaving) {
            newSavedIds.add(jobId);
            newSavedData.push(job);
        } else {
            newSavedIds.delete(jobId);
            newSavedData = newSavedData.filter(j => j.apply_url !== jobId);
        }
        setSavedJobIds(new Set(newSavedIds));
        setSavedJobsData(newSavedData);
        localStorage.setItem('midas_saved_jobs', JSON.stringify(Array.from(newSavedIds)));
        localStorage.setItem('midas_saved_jobs_data', JSON.stringify(newSavedData));
        // Sync to server in background
        fetch('/api/saved-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job, action: isSaving ? 'save' : 'unsave' }),
        }).catch(() => { /* silent — localStorage is the fallback */ });
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
            // Clear any previous error (e.g. from a prior failed upload)
            setSearchError(null);

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

    const findJobs = async () => {
        if (!profile) return;
        setIsMatching(true);
        setLogs([]);
        setSearchError(null);
        addLog("Starting job search agent...");
        addLog("Scanning job market... ~1 minute for quality matches.");
        setActiveTab('matches');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);

        // Beta: skip token check for Super Search. Restore before monetizing:
        // if (midasSearch && tokenBalance < 2 && weeklyMidasScanCount >= 1 && !isAdminUser) {
        //     setSearchError('Super Search requires 2 tokens.');
        //     setIsMatching(false);
        //     return;
        // }
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
            const res = await fetch('/api/match-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: { ...profile, experience_years: experienceYears, headline: jobTitle },
                    apiKeys,
                    preferences: { ...preferences, location: locationQuery, midasSearch, filters, exploreAdjacent }
                })
            });

            if (!res.ok) {
                if (res.status === 429) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || 'Rate limit reached. Wait before searching again.');
                }
                const errData = await res.json().catch(() => ({}));
                if (res.status === 401 && errData.requiresAuth) setSearchError('Sign in to scan for jobs.');
                else if (res.status === 403) setSearchError(errData.error || 'No tokens remaining.');
                else setSearchError(errData.error || 'Failed to fetch jobs');
                setIsMatching(false);
                return;
            }

            const data = await res.json();
            const initialMatches = data.matches || [];
            setJobs(initialMatches);
            addLog(`Found ${data.total} jobs, ${initialMatches.length} heuristic matches`);

            if (initialMatches.length > 0) {
                const top20 = initialMatches.slice(0, 20);
                const totalBatches = Math.ceil(top20.length / 4);
                addLog(`AI Agent: Deep analysis on top ${top20.length} candidates...`);
                setDeepAnalysisProgress({ current: 0, total: totalBatches });
                const chunkSize = 4;

                const updateJobWithAnalysis = (jobId, analysis) => {
                    setJobs(currentJobs => currentJobs.map(j => {
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

                setJobs(currentJobs => [...currentJobs].sort((a, b) => {
                    const scoreA = a.analysis?.fit_score || a.match_score;
                    const scoreB = b.analysis?.fit_score || b.match_score;
                    return scoreB - scoreA;
                }));
                setDeepAnalysisProgress(null);
                addLog("Analysis complete. Sorted by fit score.");
                refreshTokens();
            }

            refreshTokens();
            if (initialMatches.length === 0) setSearchError('No matching jobs found. Try broadening your search.');
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

    const clearAllData = () => {
        if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
        setConfirmClear(false);
        localStorage.removeItem('midas_profile');
        localStorage.removeItem('midas_results');
        localStorage.removeItem('midas_saved_jobs');
        localStorage.removeItem('midas_saved_jobs_data');
        setProfile(null); setJobs([]); setSavedJobIds(new Set()); setSavedJobsData([]);
        setExperienceYears(2); setJobTitle(''); setActiveTab('matches'); setSearchError(null);
        setLogs([{ message: 'All data cleared.', time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) }]);
        toast('All data cleared.', 'success');
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
    const freeScansRemaining = Math.max(0, FREE_DAILY_SCANS - dailyScanCount);

    return (
        <div className="min-h-screen bg-surface-50">
            <Header
                onShowGuide={() => setShowGuide(true)}
                onClearData={clearAllData}
                tokenBalance={tokenBalance}
            />
            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>

            <div className="flex max-w-[1280px] mx-auto px-6 gap-6 pt-16">
                {/* Left Panel */}
                <div className="w-[400px] shrink-0 py-5 space-y-4">
                    {/* Privacy */}
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-500 p-2 px-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        Resumes processed in-memory only. Never stored or used for training.
                    </div>

                    {/* Profile Readiness */}
                    {profile && (
                        <button
                            onClick={() => setReadinessOpen(!readinessOpen)}
                            className="w-full flex items-center justify-between p-2.5 px-3.5 bg-white rounded-[10px] border border-ink-200 cursor-pointer hover:bg-surface-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                </div>
                                <span className="text-[13px] font-semibold text-ink-900">Profile Ready</span>
                                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{readinessScore}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${readinessOpen ? 'rotate-180' : ''}`} />
                        </button>
                    )}

                    {readinessOpen && profile && (
                        <div className="bg-white rounded-[10px] border border-ink-200 p-3 -mt-2 space-y-1">
                            {readinessChecks.map((check, i) => (
                                <div key={i} className="flex items-center justify-between py-1 text-[13px] text-ink-600">
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

                    {/* Tokens upsell — hidden during beta, restore before monetizing */}
                    {/* <TokenSection tokenBalance={tokenBalance} dailyScanCount={dailyScanCount} freeDailyScans={FREE_DAILY_SCANS} isAdminUser={isAdminUser} initiatePayment={initiatePayment} isPaymentProcessing={isPaymentProcessing} /> */}

                    {/* Activity Log */}
                    <ActivityLog logs={logs} />
                </div>

                {/* Right Panel */}
                <div className="flex-1 py-5" ref={resultsRef}>
                    <MatchResultsGrid
                        jobs={jobs} activeTab={activeTab} setActiveTab={setActiveTab} sortBy={sortBy} setSortBy={setSortBy}
                        displayedJobs={displayedJobs} isMatching={isMatching} searchError={searchError} setSearchError={setSearchError}
                        deepAnalysisProgress={deepAnalysisProgress} savedJobIds={savedJobIds} profile={profile} apiKeys={apiKeys}
                        toggleSaveJob={toggleSaveJob} refreshTokens={refreshTokens} isPaywalled={isPaywalled}
                        initiatePayment={initiatePayment} isPaymentProcessing={isPaymentProcessing} findJobs={findJobs} freeVisibleJobs={FREE_VISIBLE_JOBS}
                    />
                </div>
            </div>

            {/* Loading Toast */}
            <AnimatePresence>
                {isMatching && (
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-white border border-ink-200 rounded-[10px] px-5 py-3 shadow-elevated max-w-sm w-[85vw]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-full border-2 border-brand-100 border-t-brand-500 animate-spin" />
                                <Sparkles className="w-3 h-3 text-brand-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-ink-900">
                                    {deepAnalysisProgress ? 'AI Deep Analysis...' : 'Scanning...'}
                                </div>
                                <div className="text-[11px] text-ink-400 truncate">
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
