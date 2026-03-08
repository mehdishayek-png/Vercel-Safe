import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, ShieldCheck, BrainCircuit, ChevronDown, Sparkles, Pencil, Compass, Target, Zap, FileText, TrendingUp } from 'lucide-react';
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
    const logsEndRef = useRef(null);

    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

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

        try {
            const saved = localStorage.getItem('midas_saved_jobs');
            if (saved) setSavedJobIds(new Set(JSON.parse(saved)));
            const savedData = localStorage.getItem('midas_saved_jobs_data');
            if (savedData) setSavedJobsData(JSON.parse(savedData));
        } catch (err) { console.error("Failed to load saved jobs:", err); setSavedJobIds(new Set()); setSavedJobsData([]); }

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

        if (midasSearch && tokenBalance < 2 && weeklyMidasScanCount >= 1 && !isAdminUser) {
            setSearchError('Super Search requires 2 tokens.');
            setIsMatching(false);
            return;
        }
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

                    {/* Resume Upload */}
                    {!profile && (
                        <>
                            <div className="bg-white rounded-xl border border-surface-200 p-5">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="upload-zone p-10 text-center cursor-pointer"
                                >
                                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        {isParsing ? <Loader2 className="animate-spin text-brand-600" /> : <Upload className="text-brand-600 w-5 h-5" />}
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">Upload Resume</p>
                                    <p className="text-xs text-gray-400 mt-1">PDF &middot; Max 10MB</p>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                            </div>

                            {/* Getting Started Guide */}
                            <div className="bg-white rounded-xl border border-surface-200 p-5">
                                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">How it works</div>
                                <div className="space-y-3">
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <FileText className="w-3.5 h-3.5 text-brand-600" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-gray-900">Upload your resume</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">We extract your skills, experience, and target role automatically.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Target className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-gray-900">Refine your profile</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Edit your target title, add or remove skills, and set your preferred location.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 rounded-lg bg-accent-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap className="w-3.5 h-3.5 text-accent-600" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-gray-900">Scan the market</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Midas scores thousands of live jobs against your profile in under a minute.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-xl border border-brand-100 p-5">
                                <div className="text-[10px] font-semibold tracking-widest text-brand-600 uppercase mb-3">Tips for best results</div>
                                <ul className="space-y-2 text-[12px] text-gray-600">
                                    <li className="flex gap-2 items-start">
                                        <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                                        <span>Use a <strong>specific target title</strong> &mdash; &ldquo;Product Operations Specialist&rdquo; beats &ldquo;Manager&rdquo;</span>
                                    </li>
                                    <li className="flex gap-2 items-start">
                                        <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                                        <span>Add <strong>tools you use</strong> as skills (Zendesk, Jira, Workato) &mdash; not just soft skills</span>
                                    </li>
                                    <li className="flex gap-2 items-start">
                                        <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                                        <span>Set your <strong>experience level</strong> accurately to filter out roles that are too senior or junior</span>
                                    </li>
                                    <li className="flex gap-2 items-start">
                                        <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                                        <span>Try <strong>Explore Adjacent Roles</strong> to discover opportunities outside your exact title</span>
                                    </li>
                                </ul>
                            </div>
                        </>
                    )}

                    {profile && (
                        <>
                            {/* Identity */}
                            <div className="bg-white rounded-xl border border-surface-200 p-5">
                                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Candidate</div>
                                <div className="text-lg font-bold text-gray-900 mb-1.5">{profile.name}</div>
                                <div className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Target Role</div>
                                {isEditingTitle ? (
                                    <input
                                        type="text"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        onBlur={() => setIsEditingTitle(false)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingTitle(false); }}
                                        autoFocus
                                        className="w-full text-[14px] font-semibold text-gray-900 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 outline-none focus:border-brand-400 transition-colors"
                                        placeholder="e.g. Product Operations Specialist"
                                    />
                                ) : (
                                    <button
                                        onClick={() => setIsEditingTitle(true)}
                                        className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 hover:bg-brand-50 hover:border-brand-200 cursor-pointer transition-colors group"
                                    >
                                        <span className="text-[14px] font-semibold text-gray-900 truncate">
                                            {jobTitle || <span className="text-gray-400 font-normal">Click to set target role...</span>}
                                        </span>
                                        <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                                    </button>
                                )}
                            </div>

                            {/* Skills */}
                            <div className="bg-white rounded-xl border border-surface-200 p-5">
                                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Skills</div>
                                <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                                    {profile.skills.map((skill) => (
                                        <span key={skill} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-50 border border-surface-200 text-xs text-gray-700 font-medium">
                                            {skill}
                                            <button onClick={() => handleRemoveSkill(skill)} className="text-gray-400 hover:text-red-500 cursor-pointer text-sm leading-none">&times;</button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={newSkill}
                                        onChange={e => setNewSkill(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                                        placeholder="Add skill..."
                                        className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-xs text-gray-700 bg-surface-50 outline-none focus:border-brand-500 transition-colors"
                                    />
                                    <button onClick={handleAddSkill} className="w-8 h-8 rounded-lg border border-surface-200 bg-surface-50 hover:bg-brand-50 hover:text-brand-600 cursor-pointer text-gray-500 flex items-center justify-center transition-colors">+</button>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-5">
                                {/* Experience */}
                                <div>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Experience</span>
                                        <span className="text-[13px] font-semibold text-brand-600">{experienceYears}y</span>
                                    </div>
                                    <input type="range" min="0" max="30" step="1" value={experienceYears} onChange={(e) => setExperienceYears(parseInt(e.target.value))} className="w-full accent-brand-600" />
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                        <span>Entry</span><span>Mid</span><span>Senior+</span>
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Location</div>
                                    <Combobox
                                        options={countries}
                                        value={preferences.country}
                                        onChange={(val) => setPreferences(prev => ({ ...prev, country: val }))}
                                        placeholder="Country..."
                                    />
                                    {!preferences.remoteOnly && (states.length > 0 || cities.length > 0) && (
                                        <div className="flex gap-2 mt-2">
                                            {states.length > 0 && (
                                                <div className="flex-1">
                                                    <Combobox options={states} value={preferences.state} onChange={(val) => setPreferences(prev => ({ ...prev, state: val }))} placeholder="State..." />
                                                </div>
                                            )}
                                            {cities.length > 0 && (
                                                <div className="flex-1">
                                                    <Combobox options={cities} value={preferences.city} onChange={(val) => setPreferences(prev => ({ ...prev, city: val }))} placeholder="City..." />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Toggles */}
                                <div className="flex flex-col gap-2">
                                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${
                                        preferences.remoteOnly ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-surface-50 border-surface-200 text-gray-600 hover:bg-surface-100'
                                    }`}>
                                        <input type="checkbox" checked={preferences.remoteOnly} onChange={e => setPreferences(prev => ({ ...prev, remoteOnly: e.target.checked }))} className="accent-emerald-500" />
                                        Remote Only
                                    </label>

                                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                                        exploreAdjacent ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-surface-50 border-surface-200 text-gray-600 hover:bg-surface-100'
                                    }`}>
                                        <input type="checkbox" checked={exploreAdjacent} onChange={e => setExploreAdjacent(e.target.checked)} className="accent-violet-500" />
                                        <span className="font-medium flex items-center gap-1.5">
                                            <Compass className="w-3.5 h-3.5" />
                                            Explore Adjacent Roles
                                        </span>
                                    </label>

                                    {tokensLoading ? (
                                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-surface-50 border-surface-200 animate-pulse">
                                            <div className="w-4 h-4 rounded bg-surface-200" />
                                            <div className="h-3 bg-surface-200 rounded w-24" />
                                        </div>
                                    ) : (
                                        <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                                            (!isAdminUser && tokenBalance < 2 && weeklyMidasScanCount >= 1)
                                                ? 'bg-surface-50 border-surface-200 opacity-50 cursor-not-allowed'
                                                : midasSearch ? 'bg-accent-50 border-accent-200 text-accent-700' : 'bg-surface-50 border-surface-200 text-gray-600 hover:bg-surface-100'
                                        }`} onClick={(e) => { if (!isAdminUser && tokenBalance < 2 && weeklyMidasScanCount >= 1) e.preventDefault(); }}>
                                            <input type="checkbox" checked={midasSearch}
                                                onChange={e => { if (isAdminUser || tokenBalance >= 2 || weeklyMidasScanCount < 1) setMidasSearch(e.target.checked); }}
                                                className="accent-accent-600"
                                            />
                                            <span className="font-medium">
                                                Super Search
                                                <span className="font-normal text-gray-400 ml-1">
                                                    {isAdminUser ? '(admin)' : weeklyMidasScanCount < 1 ? '(1 free/wk)' : tokenBalance < 2 ? '(need 2)' : '(2 tokens)'}
                                                </span>
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <button onClick={() => setProfile(null)} className="flex-1 py-2.5 rounded-lg border border-surface-200 bg-white text-xs font-medium text-gray-500 hover:bg-surface-50 cursor-pointer transition-colors">
                                        Reset
                                    </button>
                                    <button
                                        onClick={findJobs}
                                        disabled={isMatching}
                                        className="flex-[2.5] py-2.5 rounded-lg border-none text-xs font-semibold text-white cursor-pointer bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isMatching ? (
                                            <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Scanning...</span>
                                        ) : !isSignedIn ? 'Sign in to Scan'
                                            : midasSearch
                                                ? isAdminUser || weeklyMidasScanCount < 1 ? 'Super Scan (Free)' : tokenBalance >= 2 ? 'Super Scan (2 tokens)' : 'Need 2 Tokens'
                                                : `Scan (${freeScansRemaining} free)`
                                        }
                                    </button>
                                </div>
                            </div>

                            {/* Filters */}
                            <FilterPanel
                                filters={filters} flags={flags} isActive={filtersActive} activeCount={filterCount} summary={filterSummary}
                                toggleWorkArrangement={toggleWorkArrangement} toggleWorkType={toggleWorkType} toggleRegion={toggleRegion} toggleCompanySize={toggleCompanySize}
                                setSalaryMin={setSalaryMin} setSalaryCurrency={setSalaryCurrency} setIncludeMissingSalary={setIncludeMissingSalary} reset={resetFilters}
                            />
                        </>
                    )}

                    {/* Tokens upsell */}
                    <TokenSection tokenBalance={tokenBalance} dailyScanCount={dailyScanCount} freeDailyScans={FREE_DAILY_SCANS} isAdminUser={isAdminUser} initiatePayment={initiatePayment} isPaymentProcessing={isPaymentProcessing} />

                    {/* Activity Log */}
                    <div className="bg-white border border-surface-200 rounded-xl h-44 overflow-hidden flex flex-col">
                        <div className="px-4 py-2.5 border-b border-surface-100 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-brand-500" />
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Activity</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-[9px] font-medium text-emerald-600">Live</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[11px]">
                            {logs.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                    <BrainCircuit className="w-6 h-6 mb-1.5 stroke-1" />
                                    <span className="text-[10px]">Waiting...</span>
                                </div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-2 text-gray-500">
                                    <span className="opacity-40 shrink-0">{log.time}</span>
                                    <span className="border-l border-surface-200 pl-2 break-words">{log.message}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
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
