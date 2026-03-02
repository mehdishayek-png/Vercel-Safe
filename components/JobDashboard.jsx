import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Search, Check, AlertCircle, Loader2, X, Plus, MapPin, Globe, Sparkles, Bookmark, LayoutGrid, List, ShieldCheck, Clock, BrainCircuit, Lock } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Combobox } from './ui/Combobox';
import { JobCard } from './JobCard';
import { Header } from './Header';
import { GuideModal } from './GuideModal';
import { ResumeStrength } from './ResumeStrength';
import { ScanningRadar } from './ScanningRadar';
import { getAllCountries, getStatesByCountry, getCitiesByState, getCountryName } from '../lib/location-data';
import { Country, State, City } from 'country-state-city';
import { useRazorpay } from '../lib/useRazorpay';
import { useToast } from './ui/Toast';
import { useAuth } from '@clerk/nextjs';

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
    const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'saved'
    const [showGuide, setShowGuide] = useState(false);
    const [sortBy, setSortBy] = useState('score'); // 'score' | 'latest'
    const [deepAnalysisProgress, setDeepAnalysisProgress] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const toast = useToast();

    // Token / Credit System — server-verified with localStorage fallback for display
    const [tokenBalance, setTokenBalance] = useState(0);
    const [dailyScanCount, setDailyScanCount] = useState(0);
    const FREE_DAILY_SCANS = 3;
    const FREE_VISIBLE_JOBS = 4;
    const [superSearch, setSuperSearch] = useState(false);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [tokensLoading, setTokensLoading] = useState(true);

    // Fetch token balance from server
    const refreshTokens = useCallback(async () => {
        try {
            const res = await fetch('/api/tokens');
            const data = await res.json();
            if (data.source !== 'anonymous' && data.source !== 'local') {
                setTokenBalance(data.tokens);
                setDailyScanCount(data.dailyScansUsed);
                if (data.isAdmin) setIsAdminUser(true);
                // Sync to localStorage as display cache
                localStorage.setItem('midas_tokens', data.tokens.toString());
            } else {
                // Fallback to localStorage for anonymous users
                setTokenBalance(parseInt(localStorage.getItem('midas_tokens') || '0', 10));
            }
        } catch {
            setTokenBalance(parseInt(localStorage.getItem('midas_tokens') || '0', 10));
        } finally {
            setTokensLoading(false);
        }
    }, []);

    // Razorpay hook — replaces inline payment code
    const { initiatePayment, isProcessing: isPaymentProcessing } = useRazorpay({
        onSuccess: async (verifyData) => {
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
    const [experienceYears, setExperienceYears] = useState(2);
    const [jobTitle, setJobTitle] = useState('');

    // Data State
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    const fileInputRef = useRef(null);
    const resultsRef = useRef(null);

    // P0-2: LocalStorage Persistence - Load on mount
    useEffect(() => {
        // Fetch token balance from server on mount
        refreshTokens();

        try {
            const data = getAllCountries();
            if (data && Array.isArray(data)) {
                setCountries(data);
            }
        } catch (err) {
            console.error("Failed to load countries:", err);
        }

        try {
            const saved = localStorage.getItem('midas_saved_jobs');
            if (saved) {
                setSavedJobIds(new Set(JSON.parse(saved)));
            }
            const savedData = localStorage.getItem('midas_saved_jobs_data');
            if (savedData) {
                setSavedJobsData(JSON.parse(savedData));
            }
        } catch (err) {
            console.error("Failed to load saved jobs:", err);
            setSavedJobIds(new Set());
            setSavedJobsData([]);
        }

        // Restore profile from localStorage
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

        // Restore search results if recent (less than 1 hour old)
        try {
            const storedResults = localStorage.getItem('midas_results');
            if (storedResults) {
                const { jobs: savedJobs, timestamp } = JSON.parse(storedResults);
                const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;

                if (ageInMinutes < 60) {
                    setJobs(savedJobs);
                    addLog(`Restored ${savedJobs.length} jobs from last search (${Math.floor(ageInMinutes)} min ago)`);
                } else {
                    // Clear stale results
                    localStorage.removeItem('midas_results');
                }
            }
        } catch (err) {
            console.error("Failed to restore results:", err);
        }
    }, []);

    // P0-2: Save profile to localStorage whenever it changes
    useEffect(() => {
        if (profile) {
            try {
                const profileToSave = {
                    ...profile,
                    experience_years: experienceYears,
                    headline: jobTitle
                };
                localStorage.setItem('midas_profile', JSON.stringify(profileToSave));
            } catch (err) {
                console.error("Failed to save profile:", err);
            }
        }
    }, [profile, experienceYears, jobTitle]);

    // P0-2: Save search results after successful search
    useEffect(() => {
        if (jobs.length > 0 && !isMatching) {
            try {
                localStorage.setItem('midas_results', JSON.stringify({
                    jobs,
                    timestamp: Date.now()
                }));
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

            // If no states available, load cities directly for the country
            if (countryStates.length === 0) {
                setCities(getCitiesByState(preferences.country, null));
            } else {
                setCities([]);
            }

            // Reset state and city selection
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
        setProfile(prev => ({
            ...prev,
            skills: [...prev.skills, newSkill.trim()]
        }));
        setNewSkill('');
    };

    const handleRemoveSkill = (skillToRemove) => {
        if (!profile) return;
        setProfile(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skillToRemove)
        }));
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

                // 1. Try to match Country
                const allCountries = Country.getAllCountries();
                const foundCountry = allCountries.find(c =>
                    locLower.includes(c.name.toLowerCase()) ||
                    locLower.includes(c.isoCode.toLowerCase()) ||
                    (c.isoCode === 'US' && locLower.includes('usa')) ||
                    (c.isoCode === 'GB' && locLower.includes('uk'))
                );

                if (foundCountry) {
                    matchedCountry = foundCountry.isoCode;

                    // 2. Try to match State within that Country
                    const countryStates = State.getStatesOfCountry(matchedCountry);
                    const foundState = countryStates.find(s =>
                        locLower.includes(s.name.toLowerCase()) ||
                        // Only match short state codes if they are bounded by commas/spaces to avoid false positives
                        new RegExp(`\\b${s.isoCode.toLowerCase()}\\b`).test(locLower)
                    );

                    if (foundState) {
                        matchedState = foundState.isoCode;

                        // 3. Try to match City within that State
                        const stateCities = City.getCitiesOfState(matchedCountry, matchedState);
                        const foundCity = stateCities.find(c => locLower.includes(c.name.toLowerCase()));
                        if (foundCity) {
                            matchedCity = foundCity.name;
                        }
                    } else {
                        // Fallback: Try to find City just within the Country
                        const countryCities = City.getCitiesOfCountry(matchedCountry);
                        const foundCity = countryCities.find(c => locLower.includes(c.name.toLowerCase()));
                        if (foundCity) {
                            matchedCity = foundCity.name;
                            // If we found a city but no state, we can reverse lookup its state if needed, 
                            // but setting just Country & City is often enough for the UI.
                        }
                    }

                    // Apply the matching location to preferences
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

        // Scroll to results area so loading state is visible
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        // Token / scan limit check — server enforces limits too,
        // but we check client-side first for instant feedback
        if (superSearch && tokenBalance < 2) {
            setSearchError('Super Search requires 2 tokens. Purchase tokens or disable Super Search.');
            setIsMatching(false);
            return;
        }
        const isFreeScan = !superSearch && dailyScanCount < FREE_DAILY_SCANS;
        if (!isFreeScan && !superSearch && tokenBalance <= 0) {
            setSearchError('You\'ve used your 3 free daily scans. Purchase tokens to continue searching.');
            setIsMatching(false);
            return;
        }

        // Format location string
        let locationQuery = '';
        if (!preferences.remoteOnly) {
            const countryName = getCountryName(preferences.country);
            // Construct query: "City, State, Country" or "City, Country"
            const queryParts = [];
            if (preferences.city) queryParts.push(preferences.city);
            else if (preferences.state) queryParts.push(preferences.state); // Use state code if no city
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
                        superSearch
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

            // Set initial jobs immediately (Heuristic match)
            setJobs(initialMatches);
            addLog(`Found ${data.total} jobs, ${initialMatches.length} heuristic matches`);

            // ---- START DEEP ANALYSIS (Top 20) ----
            if (initialMatches.length > 0) {
                const top20 = initialMatches.slice(0, 20);
                const totalBatches = Math.ceil(top20.length / 4);
                addLog(`🤖 AI Agent: Starting deep analysis on top ${top20.length} candidates...`);
                setDeepAnalysisProgress({ current: 0, total: totalBatches });

                // Process in chunks of 4 to avoid rate limits/timeouts
                const chunkSize = 4;

                // Helper to update a single job WITHOUT re-sorting (prevents scroll jumps)
                const updateJobWithAnalysis = (jobId, analysis) => {
                    setJobs(currentJobs => {
                        return currentJobs.map(j => {
                            if (j.id === jobId || j.apply_url === jobId) {
                                return { ...j, analysis, match_score: analysis.fit_score || j.match_score };
                            }
                            return j;
                        })
                            .filter(j => {
                                // FILTER OUT: Only hide jobs with AI score < 35 (truly irrelevant)
                                if (j.analysis?.fit_score && j.analysis.fit_score < 35) {
                                    return false;
                                }
                                return true;
                            });
                        // NOTE: No .sort() here — deferred to end to prevent scroll jumps
                    });
                };

                // Process chunks
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
                                if (d.analysis) {
                                    updateJobWithAnalysis(job.id || job.apply_url, d.analysis);
                                }
                            })
                            .catch(err => console.error(`Failed to analyze ${job.title}`, err))
                    );

                    await Promise.all(promises);
                }

                // Final sort ONCE after all batches complete (prevents scroll jumps)
                setJobs(currentJobs => {
                    return [...currentJobs].sort((a, b) => {
                        const scoreA = a.analysis?.fit_score || a.match_score;
                        const scoreB = b.analysis?.fit_score || b.match_score;
                        return scoreB - scoreA;
                    });
                });

                setDeepAnalysisProgress(null);
                addLog("✨ AI Curation Complete. Jobs sorted by Fit Score.");
                // Refresh token balance from server after AI analysis
                refreshTokens();
            }
            // ---- END DEEP ANALYSIS ----

            // Refresh tokens after search (server deducted during scan)
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

    // P0-2: Clear all data function
    const clearAllData = () => {
        if (!confirmClear) {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000); // Reset after 3s
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

    // Paywall applies to ANY scan (even free ones) if the user has no tokens.
    // This allows free users to see 4 jobs, proving value before asking them to pay for the rest.
    const isPaywalled = !isAdminUser && tokenBalance <= 0;

    const displayedJobs = (() => {
        let list = activeTab === 'saved'
            ? savedJobsData
            : [...jobs];

        if (sortBy === 'latest') {
            list.sort((a, b) => {
                const parseDate = (d) => {
                    if (!d) return 0;
                    const parsed = new Date(d);
                    if (!isNaN(parsed)) return parsed.getTime();
                    // Handle relative dates like "3 days ago"
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
            list.sort((a, b) => (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0));
        }
        return list;
    })();

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 container mx-auto text-gray-900">
            <Header onShowGuide={() => setShowGuide(true)} onClearData={clearAllData} />
            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ---- Left Sidebar: Profile & Controls ---- */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-4 space-y-6"
                >
                    {/* Privacy & Timing Badge */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-white/60 p-2 rounded-lg border border-gray-100 shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                            <span>Privacy First: Resumes are processed in-memory and not used for AI training.</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-white/60 p-2 rounded-lg border border-gray-100 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>AI Analysis: Semantic matching takes 1-2 mins to process 10,000+ jobs.</span>
                        </div>
                    </div>

                    <ResumeStrength profile={profile} onTokensUpdated={refreshTokens} />

                    {/* Token Balance Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                Midas Tokens
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{tokenBalance}</div>
                        </div>
                        <div className="text-[11px] text-indigo-500 mb-3">
                            {isAdminUser ? 'Unlimited access (Admin)' :
                                dailyScanCount < FREE_DAILY_SCANS
                                    ? `${FREE_DAILY_SCANS - dailyScanCount} free scans remaining today`
                                    : tokenBalance > 0
                                        ? `${tokenBalance} tokens remaining`
                                        : 'No tokens — purchase to unlock full features'}
                        </div>
                        {(!isAdminUser && (tokenBalance > 0 || dailyScanCount >= FREE_DAILY_SCANS)) && (
                            <button
                                onClick={initiatePayment}
                                disabled={isPaymentProcessing}
                                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPaymentProcessing ? 'Processing...' : 'Get 50 Tokens — ₹399'}
                            </button>
                        )}
                    </div>

                    <div className="glass-panel p-6 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            Commander Profile
                        </h2>

                        {!profile ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group/upload relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-blue-50/30 scale-0 group-hover/upload:scale-100 transition-transform duration-500 rounded-xl origin-center" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover/upload:shadow-lg transition-all">
                                        {isParsing ? <Loader2 className="animate-spin text-blue-600" /> : <Upload className="text-blue-600 w-6 h-6" />}
                                    </div>
                                    <p className="text-base font-medium text-gray-900">Upload Resume</p>
                                    <p className="text-xs text-gray-400 mt-1">PDF Only • Max 10MB</p>
                                    <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">🔒 Your resume is processed by AI to extract skills. We never store your file.</p>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                            </div>
                        ) : (
                            <div className="space-y-6 relative z-10">
                                {/* Identity */}
                                <div>
                                    <div className="font-semibold text-lg text-gray-900">{profile.name}</div>
                                    <div className="mt-1">
                                        <label className="text-[10px] tracking-widest text-gray-400 uppercase font-semibold block mb-1">Target Role</label>
                                        <input
                                            type="text"
                                            value={jobTitle}
                                            onChange={(e) => setJobTitle(e.target.value)}
                                            className="w-full text-sm font-medium text-gray-900 border-b border-gray-200 focus:border-blue-500 focus:outline-none py-1 bg-transparent placeholder:text-gray-300"
                                            placeholder="e.g. Senior Frontend Engineer"
                                        />
                                    </div>
                                </div>

                                {/* Skills */}
                                <div>
                                    <label className="text-[10px] tracking-widest text-gray-400 uppercase font-semibold mb-2 block">Skills Matrix</label>
                                    <div className="flex flex-wrap gap-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar p-1 -m-1">
                                        {profile.skills.map(s => (
                                            <span key={s} className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 shadow-sm text-gray-700 flex items-center gap-1.5 group/skill hover:border-blue-300 transition-all">
                                                {s}
                                                <button onClick={() => handleRemoveSkill(s)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg pr-1 border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                        <input
                                            type="text"
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                            placeholder="Add skill..."
                                            className="w-full bg-transparent border-none text-xs px-3 py-2 focus:outline-none text-gray-900 placeholder:text-gray-400"
                                        />
                                        <button onClick={handleAddSkill} disabled={!newSkill.trim()} className="p-1 rounded-md bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-600 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Experience Level */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] tracking-widest text-gray-400 uppercase font-semibold">Experience Level</label>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{experienceYears} Years</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="30"
                                        step="1"
                                        value={experienceYears}
                                        onChange={(e) => setExperienceYears(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                        <span>Entry Level</span>
                                        <span>Mid-Senior</span>
                                        <span>Executive</span>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100" />

                                {/* Targeting */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-500" />
                                        Broadcasting Range
                                    </h3>

                                    <div className="space-y-3">
                                        <Combobox
                                            options={countries}
                                            value={preferences.country}
                                            onChange={(val) => setPreferences(prev => ({ ...prev, country: val }))}
                                            placeholder="Select Country..."
                                        />

                                        {!preferences.remoteOnly && (states.length > 0 || cities.length > 0) && (
                                            <div className="flex gap-3">
                                                {states.length > 0 && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex-1">
                                                        <Combobox
                                                            options={states}
                                                            value={preferences.state}
                                                            onChange={(val) => setPreferences(prev => ({ ...prev, state: val }))}
                                                            placeholder="Select State..."
                                                            searchPlaceholder="Search states..."
                                                        />
                                                    </motion.div>
                                                )}
                                                {cities.length > 0 && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex-1">
                                                        <Combobox
                                                            options={cities}
                                                            value={preferences.city}
                                                            onChange={(val) => setPreferences(prev => ({ ...prev, city: val }))}
                                                            placeholder="City (Optional)"
                                                            searchPlaceholder="Search cities..."
                                                        />
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}

                                        <div
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${preferences.remoteOnly ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                            onClick={() => setPreferences(prev => ({ ...prev, remoteOnly: !prev.remoteOnly }))}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${preferences.remoteOnly ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                                                {preferences.remoteOnly && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span className={`text-xs font-medium select-none ${preferences.remoteOnly ? 'text-blue-700' : 'text-gray-600'}`}>Global Remote Only</span>
                                        </div>

                                        {/* Super Search Toggle */}
                                        {tokensLoading ? (
                                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 border-gray-200 animate-pulse">
                                                <div className="w-5 h-5 rounded border border-gray-200 bg-gray-200" />
                                                <div className="h-3 bg-gray-200 rounded w-24" />
                                            </div>
                                        ) : (
                                            <div
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${(!isAdminUser && tokenBalance < 2)
                                                    ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                                                    : superSearch
                                                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 cursor-pointer'
                                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer'
                                                    }`}
                                                onClick={() => (isAdminUser || tokenBalance >= 2) && setSuperSearch(!superSearch)}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${superSearch ? 'bg-amber-500 border-amber-500' : 'border-gray-300 bg-white'}`}>
                                                    {superSearch && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <span className={`text-xs font-medium select-none ${superSearch ? 'text-amber-700' : 'text-gray-600'}`}>⚡ Super Search</span>
                                                    <span className="text-[10px] text-gray-400 ml-1">
                                                        {isAdminUser ? '(admin — unlimited)' : tokenBalance < 2 ? '(need 2 tokens)' : '(2 tokens per scan, 3× sources)'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <Button onClick={() => setProfile(null)} variant="outline" size="sm" className="w-1/3 text-xs border-gray-200 text-gray-600 hover:bg-gray-50">Reset</Button>
                                        <Button onClick={findJobs} isLoading={isMatching} className="w-2/3 text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                                            {!isSignedIn
                                                ? '🔒 Sign in to Scan'
                                                : superSearch
                                                    ? tokenBalance >= 2 ? 'Super Scan (2 tokens)' : '🔒 Need 2 Tokens'
                                                    : dailyScanCount < FREE_DAILY_SCANS
                                                        ? `Initialize Scan (${FREE_DAILY_SCANS - dailyScanCount} free)`
                                                        : tokenBalance > 0
                                                            ? `Scan (1 token)`
                                                            : '🔒 Get Tokens to Scan'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Agent Activity Feed */}
                    <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-0 h-48 overflow-hidden flex flex-col shadow-sm relative group hover:shadow-md transition-shadow">
                        <div className="px-4 py-3 bg-white/50 border-b border-gray-100 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
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
                                    <span className="opacity-40 shrink-0">
                                        {log.time}
                                    </span>
                                    <span className="border-l-2 border-blue-100 pl-3 break-words">
                                        {log.message}
                                    </span>
                                </motion.div>
                            ))}
                            <div ref={el => el?.scrollIntoView({ behavior: 'smooth' })} />
                        </div>
                    </div>
                </motion.div>

                {/* ---- Right Col: Results ---- */}
                <div className="lg:col-span-8" ref={resultsRef}>
                    <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl p-2 mb-6 flex items-center justify-between shadow-sm">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('matches')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'matches' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4" />
                                    Matches <span className="opacity-50 text-xs">({jobs.length})</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('saved')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'saved' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Bookmark className="w-4 h-4" />
                                    Saved <span className="opacity-50 text-xs">({savedJobIds.size})</span>
                                </div>
                            </button>
                        </div>
                        {jobs.length > 0 && (
                            <div className="flex gap-1 bg-gray-100/80 rounded-lg p-0.5">
                                <button
                                    onClick={() => setSortBy('score')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortBy === 'score' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Top Score
                                </button>
                                <button
                                    onClick={() => setSortBy('latest')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortBy === 'latest' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Latest
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {isMatching && !deepAnalysisProgress && (
                            <ScanningRadar />
                        )}

                        {
                            searchError && !isMatching && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
                                >
                                    <div className="text-amber-500 mt-0.5 text-lg">{searchError.type === 'resume' ? '📄' : '⚠️'}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-amber-800 font-medium">{searchError.message || searchError}</p>
                                        <div className="flex gap-2 mt-3">
                                            {searchError.canRetry && (
                                                <button
                                                    onClick={() => { setSearchError(null); findJobs(); }}
                                                    className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                                                >
                                                    Retry Search
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSearchError(null)}
                                                className="text-xs px-3 py-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        }

                        {/* Deep Analysis Progress Banner */}
                        {deepAnalysisProgress && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="sticky top-2 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl px-5 py-3.5 shadow-lg shadow-indigo-500/25 flex items-center gap-4"
                            >
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    <Sparkles className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold">AI Deep Analysis in Progress...</div>
                                    <div className="text-xs text-white/70">Batch {deepAnalysisProgress.current} of {deepAnalysisProgress.total} — Scores will re-sort when complete</div>
                                </div>
                                <div className="text-xs font-mono bg-white/20 rounded-lg px-2.5 py-1">
                                    {deepAnalysisProgress.current}/{deepAnalysisProgress.total}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="space-y-4 mt-4">
                        <AnimatePresence>
                            {displayedJobs.map((job, i) => {
                                const shouldBlur = isPaywalled && activeTab === 'matches' && i >= FREE_VISIBLE_JOBS;
                                if (shouldBlur && i === FREE_VISIBLE_JOBS) {
                                    // Show paywall CTA once at the blur boundary
                                    return (
                                        <div key="paywall-cta">
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="relative rounded-2xl overflow-hidden mb-4"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white z-10 flex flex-col items-center justify-center">
                                                    <Lock className="w-8 h-8 text-indigo-500 mb-3" />
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">+{displayedJobs.length - FREE_VISIBLE_JOBS} more matches found</h3>
                                                    <p className="text-sm text-gray-500 mb-4">Unlock all results with tokens</p>
                                                    <button
                                                        onClick={initiatePayment}
                                                        disabled={isPaymentProcessing}
                                                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-full hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                                                    >
                                                        {isPaymentProcessing ? 'Processing...' : 'Unlock All — Get 50 Tokens for ₹399'}
                                                    </button>
                                                </div>
                                                <div className="filter blur-md pointer-events-none">
                                                    <JobCard
                                                        job={job}
                                                        profile={profile}
                                                        apiKeys={apiKeys}
                                                        onSave={toggleSaveJob}
                                                        isSaved={false}
                                                        onTokensUpdated={refreshTokens}
                                                    />
                                                </div>
                                            </motion.div>
                                        </div>
                                    );
                                }
                                if (shouldBlur) return null; // Hide remaining blurred cards
                                return (
                                    <JobCard
                                        key={job.id || job.apply_url || `job-${i}`}
                                        job={job}
                                        profile={profile}
                                        apiKeys={apiKeys}
                                        onSave={toggleSaveJob}
                                        isSaved={savedJobIds.has(job.apply_url)}
                                        onTokensUpdated={refreshTokens}
                                    />
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Fixed Loading Toast - visible from any scroll position */}
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
                                <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin" />
                                <Sparkles className="w-4 h-4 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
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

            <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent pointer-events-none" />
            <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent pointer-events-none" />
        </div >
    );
}
