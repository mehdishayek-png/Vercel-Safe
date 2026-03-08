import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, X, Plus, Sparkles, ShieldCheck, BrainCircuit } from 'lucide-react';
import { Combobox } from './ui/Combobox';
import { Header } from './Header';
import { GuideModal } from './GuideModal';
import { FilterPanel } from './FilterPanel';
import { TokenSection } from './TokenSection';
import { MatchResultsGrid } from './MatchResultsGrid';
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

    // Profile readiness collapsible
    const [readinessOpen, setReadinessOpen] = useState(false);

    // Filter state (feature-flagged pre-filter system)
    const {
        filters, flags,
        isActive: filtersActive, activeCount: filterCount, summary: filterSummary,
        toggleWorkArrangement, toggleWorkType, toggleRegion, toggleCompanySize,
        setSalaryMin, setSalaryCurrency, setIncludeMissingSalary, reset: resetFilters,
    } = useFilters();

    // Fetch token balance from server
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

    // Razorpay hook
    const { initiatePayment, isProcessing: isPaymentProcessing } = useRazorpay({
        onSuccess: async () => {
            await refreshTokens();
            toast('✅ 50 tokens credited! Happy hunting.', 'success');
        },
        onError: (err) => {
            toast(`Payment error: ${err.message}`, 'error');
        }
    });

    // Preferences State
    const [preferences, setPreferences] = useState({ country: 'US', state: '', city: '', remoteOnly: false });
    const [newSkill, setNewSkill] = useState('');
    const [experienceYears, setExperienceYears] = useState(0);
    const [jobTitle, setJobTitle] = useState('');

    const resultsRef = useRef(null);
    const logsEndRef = useRef(null);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const fileInputRef = useRef(null);

    // Load on mount
    useEffect(() => {
        refreshTokens();

        try {
            const data = getAllCountries();
            if (data && Array.isArray(data)) setCountries(data);
        } catch (err) {
            console.error("Failed to load countries:", err);
        }

        try {
            const saved = localStorage.getItem('midas_saved_jobs');
            if (saved) setSavedJobIds(new Set(JSON.parse(saved)));
            const savedData = localStorage.getItem('midas_saved_jobs_data');
            if (savedData) setSavedJobsData(JSON.parse(savedData));
        } catch (err) {
            console.error("Failed to load saved jobs:", err);
            setSavedJobIds(new Set());
            setSavedJobsData([]);
        }

        try {
            const storedProfile = localStorage.getItem('midas_profile');
            if (storedProfile) {
                const parsed = JSON.parse(storedProfile);
                setProfile(parsed);
                if (parsed.experience_years) setExperienceYears(parsed.experience_years);
                if (parsed.headline) setJobTitle(parsed.headline);
            }
        } catch (err) {
            console.error("Failed to restore profile:", err);
        }

        try {
            const storedResults = localStorage.getItem('midas_results');
            if (storedResults) {
                const { jobs: savedJobs, timestamp } = JSON.parse(storedResults);
                const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;
                if (ageInMinutes < 60) {
                    setJobs(savedJobs);
                    addLog(`Restored ${savedJobs.length} jobs from last search (${Math.floor(ageInMinutes)} min ago)`);
                } else {
                    localStorage.removeItem('midas_results');
                }
            }
        } catch (err) {
            console.error("Failed to restore results:", err);
        }
    }, []);

    // Save profile to localStorage whenever it changes
    useEffect(() => {
        if (profile) {
            try {
                const profileToSave = { ...profile, experience_years: experienceYears, headline: jobTitle };
                localStorage.setItem('midas_profile', JSON.stringify(profileToSave));
            } catch (err) {
                console.error("Failed to save profile:", err);
            }
        }
    }, [profile, experienceYears, jobTitle]);

    // Save search results after successful search
    useEffect(() => {
        if (jobs.length > 0 && !isMatching) {
            try {
                localStorage.setItem('midas_results', JSON.stringify({ jobs, timestamp: Date.now() }));
            } catch (err) {
                console.error("Failed to save results:", err);
            }
        }
    }, [jobs, isMatching]);

    // Load states when country changes
    useEffect(() => {
        if (preferences.country) {
            const countryStates = getStatesByCountry(preferences.country);
            setStates(countryStates);
            if (countryStates.length === 0) {
                setCities(getCitiesByState(preferences.country, null));
            } else {
                setCities([]);
            }
            setPreferences(prev => ({ ...prev, state: '', city: '' }));
        } else {
            setStates([]);
            setCities([]);
        }
    }, [preferences.country]);

    // Load cities when state changes
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

    // ---- Bookmarking Logic ----
    const toggleSaveJob = (job) => {
        const newSavedIds = new Set(savedJobIds);
        const jobId = job.apply_url;
        let newSavedData = [...savedJobsData];

        if (newSavedIds.has(jobId)) {
            newSavedIds.delete(jobId);
            newSavedData = newSavedData.filter(j => j.apply_url !== jobId);
        } else {
            newSavedIds.add(jobId);
            newSavedData.push(job);
        }

        setSavedJobIds(new Set(newSavedIds));
        setSavedJobsData(newSavedData);
        localStorage.setItem('midas_saved_jobs', JSON.stringify(Array.from(newSavedIds)));
        localStorage.setItem('midas_saved_jobs_data', JSON.stringify(newSavedData));
    };

    // ---- Skill Editing Logic ----
    const handleAddSkill = () => {
        if (!newSkill.trim() || !profile) return;
        if (profile.skills.includes(newSkill.trim())) {
            setNewSkill('');
            return;
        }
        setProfile(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
        setNewSkill('');
    };

    const handleRemoveSkill = (skillToRemove) => {
        if (!profile) return;
        setProfile(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillToRemove) }));
    };

    // ---- Resume Upload ----
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        addLog("Parsing resume...");

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/parse-resume', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to parse resume (${res.status})`);
            }

            const data = await res.json();
            setProfile(data.profile);
            if (typeof data.profile.experience_years === 'number') {
                setExperienceYears(data.profile.experience_years);
            }
            if (data.profile.headline) {
                setJobTitle(data.profile.headline);
            }

            // Intelligent Location Pre-Population
            if (data.profile.location) {
                addLog(`Detected location: ${data.profile.location}. Attempting to map...`);
                let matchedCountry = '';
                let matchedState = '';
                let matchedCity = '';

                const locLower = data.profile.location.toLowerCase();

                const allCountries = Country.getAllCountries();
                const foundCountry = allCountries.find(c =>
                    locLower.includes(c.name.toLowerCase()) ||
                    locLower.includes(c.isoCode.toLowerCase()) ||
                    (c.isoCode === 'US' && locLower.includes('usa')) ||
                    (c.isoCode === 'GB' && locLower.includes('uk'))
                );

                if (foundCountry) {
                    matchedCountry = foundCountry.isoCode;

                    const countryStates = State.getStatesOfCountry(matchedCountry);
                    const foundState = countryStates.find(s =>
                        locLower.includes(s.name.toLowerCase()) ||
                        new RegExp(`\\b${s.isoCode.toLowerCase()}\\b`).test(locLower)
                    );

                    if (foundState) {
                        matchedState = foundState.isoCode;
                        const stateCities = City.getCitiesOfState(matchedCountry, matchedState);
                        const foundCity = stateCities.find(c => locLower.includes(c.name.toLowerCase()));
                        if (foundCity) matchedCity = foundCity.name;
                    } else {
                        const countryCities = City.getCitiesOfCountry(matchedCountry);
                        const foundCity = countryCities.find(c => locLower.includes(c.name.toLowerCase()));
                        if (foundCity) matchedCity = foundCity.name;
                    }

                    setPreferences(prev => ({
                        ...prev,
                        country: matchedCountry,
                        state: matchedState,
                        city: matchedCity
                    }));
                    addLog(`Successfully mapped location to ${foundCountry.name}`);
                }
            }

            addLog(`Extracted profile for ${data.profile.name}`);
        } catch (err) {
            const msg = err.message.toLowerCase();
            let userMessage;
            if (msg.includes('pdf') || msg.includes('parse')) {
                userMessage = "We couldn't read this PDF. Try saving it as a simpler PDF (no scans) or paste your info manually.";
            } else if (msg.includes('network') || msg.includes('fetch')) {
                userMessage = 'Network error. Check your connection and try again.';
            } else {
                userMessage = `Resume upload failed: ${err.message}`;
            }
            addLog(`⚠️ ${userMessage}`);
            setSearchError({ type: 'resume', message: userMessage });
        } finally {
            setIsParsing(false);
        }
    };

    // ---- Job Search ----
    const findJobs = async () => {
        if (!profile) return;
        setIsMatching(true);
        setLogs([]);
        setSearchError(null);
        addLog("Starting job search agent...");
        addLog("Scanning job market... This may take ~1 minute for high-quality matches.");
        setActiveTab('matches');
        setSearchError(null);

        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        if (midasSearch && tokenBalance < 2 && weeklyMidasScanCount >= 1 && !isAdminUser) {
            setSearchError('Midas Search requires 2 tokens. Purchase tokens or disable Midas Search.');
            setIsMatching(false);
            return;
        }
        const isFreeScan = !midasSearch && dailyScanCount < FREE_DAILY_SCANS;
        if (!isFreeScan && !midasSearch && tokenBalance <= 0 && !isAdminUser) {
            setSearchError('You\'ve used your free daily scans. Purchase tokens to continue searching.');
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
                    preferences: {
                        ...preferences,
                        location: locationQuery,
                        midasSearch,
                        filters,
                    }
                })
            });

            if (!res.ok) {
                if (res.status === 429) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || 'Rate limit reached. Please wait before searching again.');
                }
                const errData = await res.json().catch(() => ({}));
                if (res.status === 401 && errData.requiresAuth) {
                    setSearchError('⚡ Sign in to scan for jobs. Free users get 3 scans per day!');
                } else if (res.status === 403) {
                    setSearchError(errData.error || 'No tokens remaining. Purchase tokens to continue.');
                } else {
                    setSearchError(errData.error || 'Failed to fetch jobs');
                }
                setIsMatching(false);
                return;
            }

            const data = await res.json();
            const initialMatches = data.matches || [];

            setJobs(initialMatches);
            addLog(`Found ${data.total} jobs, ${initialMatches.length} heuristic matches`);

            // ---- DEEP ANALYSIS (Top 20) ----
            if (initialMatches.length > 0) {
                const top20 = initialMatches.slice(0, 20);
                const totalBatches = Math.ceil(top20.length / 4);
                addLog(`🤖 AI Agent: Starting deep analysis on top ${top20.length} candidates...`);
                setDeepAnalysisProgress({ current: 0, total: totalBatches });

                const chunkSize = 4;

                const updateJobWithAnalysis = (jobId, analysis) => {
                    setJobs(currentJobs => {
                        return currentJobs.map(j => {
                            if (j.id === jobId || j.apply_url === jobId) {
                                return { ...j, analysis, match_score: analysis.fit_score || j.match_score };
                            }
                            return j;
                        }).filter(j => {
                            if (j.analysis?.fit_score && j.analysis.fit_score < 35) return false;
                            return true;
                        });
                    });
                };

                for (let i = 0; i < top20.length; i += chunkSize) {
                    const chunk = top20.slice(i, i + chunkSize);
                    const batchNum = Math.floor(i / chunkSize) + 1;
                    addLog(`Analyzing batch ${batchNum}/${totalBatches}...`);
                    setDeepAnalysisProgress({ current: batchNum, total: totalBatches });

                    const promises = chunk.map(job =>
                        fetch('/api/analyze-job', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                job,
                                profile: { ...profile, experience_years: experienceYears, headline: jobTitle },
                                apiKeys
                            })
                        })
                            .then(r => r.json())
                            .then(d => {
                                if (d.analysis) updateJobWithAnalysis(job.id || job.apply_url, d.analysis);
                            })
                            .catch(err => console.error(`Failed to analyze ${job.title}`, err))
                    );

                    await Promise.all(promises);
                }

                setJobs(currentJobs => {
                    return [...currentJobs].sort((a, b) => {
                        const scoreA = a.analysis?.fit_score || a.match_score;
                        const scoreB = b.analysis?.fit_score || b.match_score;
                        return scoreB - scoreA;
                    });
                });

                setDeepAnalysisProgress(null);
                addLog("✨ AI Curation Complete. Jobs sorted by Fit Score.");
                refreshTokens();
            }

            refreshTokens();

            if (initialMatches.length === 0) {
                setSearchError('No matching jobs found in your specified location or remote. Try broadening your search or adjusting your skills.');
            }

        } catch (err) {
            const hasPartialResults = jobs.length > 0;
            const userMessage = hasPartialResults
                ? `Search partially failed: ${err.message}. Showing ${jobs.length} results found so far.`
                : `Job search failed: ${err.message}. Please try again.`;
            addLog(`⚠️ ${userMessage}`);
            setSearchError({ type: 'search', message: userMessage, canRetry: true });
        } finally {
            setIsMatching(false);
        }
    };

    // Clear all data
    const clearAllData = () => {
        if (!confirmClear) {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000);
            return;
        }
        setConfirmClear(false);
        localStorage.removeItem('midas_profile');
        localStorage.removeItem('midas_results');
        localStorage.removeItem('midas_saved_jobs');
        localStorage.removeItem('midas_saved_jobs_data');
        setProfile(null);
        setJobs([]);
        setSavedJobIds(new Set());
        setSavedJobsData([]);
        setExperienceYears(2);
        setJobTitle('');
        setActiveTab('matches');
        setSearchError(null);
        setLogs([{
            message: 'All data cleared. Waiting for new instructions.',
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
        }]);
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
            const listWithIndex = list.map((item, index) => ({ item, index }));
            listWithIndex.sort((A, B) => {
                const scoreDiff = (B.item.analysis?.fit_score || B.item.match_score || 0) - (A.item.analysis?.fit_score || A.item.match_score || 0);
                if (scoreDiff !== 0) return scoreDiff;
                return A.index - B.index;
            });
            list = listWithIndex.map(x => x.item);
        }
        return list;
    })();

    // Profile readiness checks
    const readinessChecks = profile ? [
        { label: "Identity & Core Targets", passed: !!(profile.name && jobTitle), points: 20 },
        { label: "Semantic Skills Parsed", passed: profile.skills?.length > 0, points: 20 },
        { label: "High-Signal Expertise", passed: profile.skills?.length >= 5, points: 20 },
        { label: "Experience Delta Locked", passed: true, points: 20 },
        { label: "Ready for Deep Scan", passed: true, points: 20 },
    ] : [];
    const readinessScore = readinessChecks.reduce((acc, c) => c.passed ? acc + c.points : acc, 0);
    const freeScansRemaining = Math.max(0, FREE_DAILY_SCANS - dailyScanCount);

    return (
        <div className="min-h-screen bg-[#f5f6f8]" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

            <Header
                onShowGuide={() => setShowGuide(true)}
                onClearData={clearAllData}
                tokenBalance={tokenBalance}
            />
            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>

            <div className="flex max-w-[1280px] mx-auto px-6 gap-6 pt-[60px]">
                {/* ---- Left Panel ---- */}
                <div className="w-[420px] shrink-0 pt-5 pb-10 space-y-4">
                    {/* Privacy notice */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 p-2 px-3 bg-green-50 rounded-lg border border-green-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        Resumes processed in-memory only. Never used for training.
                    </div>

                    {/* Profile Readiness — collapsed by default */}
                    {profile && (
                        <>
                            <button
                                onClick={() => setReadinessOpen(!readinessOpen)}
                                className="w-full flex items-center justify-between p-2.5 px-3.5 bg-white rounded-[10px] border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center text-[11px] font-bold text-green-600">
                                        ✓
                                    </div>
                                    <span className="text-[13px] font-semibold text-gray-900">Profile Ready</span>
                                    <span className="text-[11px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        {readinessScore}
                                    </span>
                                </div>
                                <svg
                                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="#94a3b8" strokeWidth="2"
                                    className={`transition-transform duration-200 ${readinessOpen ? 'rotate-180' : ''}`}
                                >
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </button>

                            <AnimatePresence>
                                {readinessOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-white rounded-[10px] border border-gray-200 p-3 px-4 -mt-2 overflow-hidden"
                                    >
                                        {readinessChecks.map((check, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between py-1.5 text-[13px] text-slate-600 ${i < readinessChecks.length - 1 ? 'border-b border-slate-100' : ''}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={check.passed ? '#22c55e' : '#cbd5e1'} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                                    {check.label}
                                                </div>
                                                {check.passed && (
                                                    <span className="text-xs text-green-500 font-semibold">+{check.points}</span>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}

                    {/* Resume Upload — shown when no profile */}
                    {!profile && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                            >
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    {isParsing ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload className="text-indigo-600 w-6 h-6" />}
                                </div>
                                <p className="text-base font-medium text-gray-900">Upload Resume</p>
                                <p className="text-xs text-gray-400 mt-1">PDF Only &middot; Max 10MB</p>
                                <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">🔒 Your resume is processed by AI to extract skills. We never store your file.</p>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                        </div>
                    )}

                    {profile && (
                        <>
                            {/* Identity Card */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase mb-1">
                                    Candidate
                                </div>
                                <div className="text-lg font-bold text-gray-900 mb-0.5">
                                    {profile.name}
                                </div>
                                <div className="text-[13px] text-slate-500">
                                    Target:{' '}
                                    <input
                                        type="text"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        className="font-medium text-gray-900 border-none bg-transparent focus:outline-none p-0 inline"
                                        placeholder="e.g. Senior Frontend Engineer"
                                        style={{ width: Math.max(180, jobTitle.length * 8) }}
                                    />
                                </div>
                            </div>

                            {/* Skills Matrix */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase mb-3">
                                    Skills Matrix
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-3 max-h-40 overflow-y-auto">
                                    {profile.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-md bg-slate-50 border border-slate-200 text-[12.5px] text-slate-700 font-medium transition-all"
                                        >
                                            {skill}
                                            <button
                                                onClick={() => handleRemoveSkill(skill)}
                                                className="text-slate-400 hover:text-red-500 cursor-pointer text-sm leading-none transition-colors"
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={newSkill}
                                        onChange={e => setNewSkill(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                                        placeholder="Add skill..."
                                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-slate-50 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)] transition-all"
                                    />
                                    <button
                                        onClick={handleAddSkill}
                                        className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer text-lg text-slate-500 flex items-center justify-center transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Experience + Location + Toggles + Scan */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                                {/* Experience Level */}
                                <div>
                                    <div className="flex justify-between items-baseline mb-2.5">
                                        <span className="text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
                                            Experience Level
                                        </span>
                                        <span className="text-[13px] font-semibold text-indigo-500">
                                            {experienceYears} {experienceYears === 1 ? 'Year' : 'Years'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="30"
                                        step="1"
                                        value={experienceYears}
                                        onChange={(e) => setExperienceYears(parseInt(e.target.value))}
                                        className="w-full accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                                        <span>Entry Level</span>
                                        <span>Mid-Senior</span>
                                        <span>Executive</span>
                                    </div>
                                </div>

                                {/* Broadcasting Range */}
                                <div>
                                    <div className="text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase mb-2">
                                        Broadcasting Range
                                    </div>
                                    <Combobox
                                        options={countries}
                                        value={preferences.country}
                                        onChange={(val) => setPreferences(prev => ({ ...prev, country: val }))}
                                        placeholder="Select Country..."
                                    />

                                    {!preferences.remoteOnly && (states.length > 0 || cities.length > 0) && (
                                        <div className="flex gap-3 mt-3">
                                            {states.length > 0 && (
                                                <div className="flex-1">
                                                    <Combobox
                                                        options={states}
                                                        value={preferences.state}
                                                        onChange={(val) => setPreferences(prev => ({ ...prev, state: val }))}
                                                        placeholder="Select State..."
                                                        searchPlaceholder="Search states..."
                                                    />
                                                </div>
                                            )}
                                            {cities.length > 0 && (
                                                <div className="flex-1">
                                                    <Combobox
                                                        options={cities}
                                                        value={preferences.city}
                                                        onChange={(val) => setPreferences(prev => ({ ...prev, city: val }))}
                                                        placeholder="City (Optional)"
                                                        searchPlaceholder="Search cities..."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Toggles */}
                                <div className="flex flex-col gap-2.5">
                                    <label
                                        className={`flex items-center gap-2.5 p-2 px-3 rounded-lg border cursor-pointer transition-all text-[13px] font-medium text-slate-700 ${
                                            preferences.remoteOnly
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={preferences.remoteOnly}
                                            onChange={e => setPreferences(prev => ({ ...prev, remoteOnly: e.target.checked }))}
                                            className="accent-green-500"
                                        />
                                        Global Remote Only
                                    </label>

                                    {tokensLoading ? (
                                        <div className="flex items-center gap-3 p-2 px-3 rounded-lg border bg-slate-50 border-slate-200 animate-pulse">
                                            <div className="w-4 h-4 rounded bg-slate-200" />
                                            <div className="h-3 bg-slate-200 rounded w-24" />
                                        </div>
                                    ) : (
                                        <label
                                            className={`flex items-center gap-2.5 p-2 px-3 rounded-lg border cursor-pointer transition-all text-[13px] text-slate-700 ${
                                                (!isAdminUser && tokenBalance < 2 && weeklyMidasScanCount >= 1)
                                                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                                    : midasSearch
                                                        ? 'bg-violet-50 border-violet-200'
                                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                            }`}
                                            onClick={(e) => {
                                                if (!isAdminUser && tokenBalance < 2 && weeklyMidasScanCount >= 1) e.preventDefault();
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={midasSearch}
                                                onChange={e => {
                                                    if (isAdminUser || tokenBalance >= 2 || weeklyMidasScanCount < 1) {
                                                        setMidasSearch(e.target.checked);
                                                    }
                                                }}
                                                className="accent-violet-600"
                                            />
                                            <span className="font-medium">
                                                ⚡ Super Search
                                                <span className="font-normal text-slate-400 ml-1.5 text-xs">
                                                    {isAdminUser ? '(admin — unlimited)' : weeklyMidasScanCount < 1 ? '(1 free this week)' : tokenBalance < 2 ? '(need 2 tokens)' : '(2 tokens)'}
                                                </span>
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {/* Scan buttons */}
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={() => setProfile(null)}
                                        className="flex-1 py-3 rounded-[10px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={findJobs}
                                        disabled={isMatching}
                                        className="flex-[2.5] py-3 rounded-[10px] border-none text-[13px] font-semibold text-white cursor-pointer shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
                                    >
                                        {isMatching ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Scanning...
                                            </span>
                                        ) : !isSignedIn
                                            ? '🔒 Sign in to Scan'
                                            : midasSearch
                                                ? isAdminUser || weeklyMidasScanCount < 1 ? '⚡ Super Scan (Free)' : tokenBalance >= 2 ? '⚡ Super Scan (2 tokens)' : '🔒 Need 2 Tokens'
                                                : `Initialize Scan (${freeScansRemaining} free)`
                                        }
                                    </button>
                                </div>
                            </div>

                            {/* Filter Panel */}
                            <FilterPanel
                                filters={filters}
                                flags={flags}
                                isActive={filtersActive}
                                activeCount={filterCount}
                                summary={filterSummary}
                                toggleWorkArrangement={toggleWorkArrangement}
                                toggleWorkType={toggleWorkType}
                                toggleRegion={toggleRegion}
                                toggleCompanySize={toggleCompanySize}
                                setSalaryMin={setSalaryMin}
                                setSalaryCurrency={setSalaryCurrency}
                                setIncludeMissingSalary={setIncludeMissingSalary}
                                reset={resetFilters}
                            />
                        </>
                    )}

                    {/* Token upsell */}
                    <TokenSection
                        tokenBalance={tokenBalance}
                        dailyScanCount={dailyScanCount}
                        freeDailyScans={FREE_DAILY_SCANS}
                        isAdminUser={isAdminUser}
                        initiatePayment={initiatePayment}
                        isPaymentProcessing={isPaymentProcessing}
                    />

                    {/* Agent Activity Feed */}
                    <div className="bg-white border border-gray-200 rounded-xl h-48 overflow-hidden flex flex-col">
                        <div className="px-4 py-3 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Agent Activity</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-medium text-emerald-600">Live</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
                            {logs.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                    <BrainCircuit className="w-8 h-8 mb-2 stroke-1" />
                                    <span>Waiting for instructions...</span>
                                </div>
                            )}
                            {logs.map((log, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={i}
                                    className="flex gap-3 text-gray-600"
                                >
                                    <span className="opacity-40 shrink-0">{log.time}</span>
                                    <span className="border-l-2 border-indigo-100 pl-3 break-words">{log.message}</span>
                                </motion.div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>

                {/* ---- Right Panel: Results ---- */}
                <div className="flex-1 pt-5" ref={resultsRef}>
                    <MatchResultsGrid
                        jobs={jobs}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        displayedJobs={displayedJobs}
                        isMatching={isMatching}
                        searchError={searchError}
                        setSearchError={setSearchError}
                        deepAnalysisProgress={deepAnalysisProgress}
                        savedJobIds={savedJobIds}
                        profile={profile}
                        apiKeys={apiKeys}
                        toggleSaveJob={toggleSaveJob}
                        refreshTokens={refreshTokens}
                        isPaywalled={isPaywalled}
                        initiatePayment={initiatePayment}
                        isPaymentProcessing={isPaymentProcessing}
                        findJobs={findJobs}
                        freeVisibleJobs={FREE_VISIBLE_JOBS}
                    />
                </div>
            </div>

            {/* Fixed Loading Toast */}
            <AnimatePresence>
                {isMatching && (
                    <motion.div
                        initial={{ opacity: 0, y: 80 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 80 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-2xl border border-white/50 rounded-2xl px-6 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-w-md w-[90vw]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full border-2 border-indigo-100 border-t-indigo-500 animate-spin" />
                                <Sparkles className="w-4 h-4 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 mb-1">
                                    {deepAnalysisProgress ? 'AI Deep Analysis...' : 'Scanning Job Market...'}
                                </div>
                                <div className="text-[11px] text-gray-500 truncate">
                                    {deepAnalysisProgress
                                        ? `Analyzing batch ${deepAnalysisProgress.current}/${deepAnalysisProgress.total}...`
                                        : logs.length > 0 ? logs[logs.length - 1].message : 'Initializing search agent...'}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
