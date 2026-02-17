import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Search, Check, AlertCircle, Loader2, X, Plus, MapPin, Globe, Sparkles, Bookmark, LayoutGrid, List, ShieldCheck, Clock, BrainCircuit } from 'lucide-react';
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

export function JobDashboard({ apiKeys, onBack }) {
    const [profile, setProfile] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [logs, setLogs] = useState([]);
    const [searchError, setSearchError] = useState(null);
    const [savedJobIds, setSavedJobIds] = useState(new Set());
    const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'saved'
    const [showGuide, setShowGuide] = useState(false);
    const [sortBy, setSortBy] = useState('score'); // 'score' | 'latest'

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
        try {
            const data = getAllCountries();
            if (data && Array.isArray(data)) {
                setCountries(data);
            }
        } catch (err) {
            console.error("Failed to load countries:", err);
        }

        try {
            const saved = localStorage.getItem('jobbot_saved_jobs');
            if (saved) {
                setSavedJobIds(new Set(JSON.parse(saved)));
            }
        } catch (err) {
            console.error("Failed to load saved jobs:", err);
            setSavedJobIds(new Set());
        }

        // Restore profile from localStorage
        try {
            const storedProfile = localStorage.getItem('jobbot_profile');
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
            const storedResults = localStorage.getItem('jobbot_results');
            if (storedResults) {
                const { jobs: savedJobs, timestamp } = JSON.parse(storedResults);
                const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;

                if (ageInMinutes < 60) {
                    setJobs(savedJobs);
                    addLog(`Restored ${savedJobs.length} jobs from last search (${Math.floor(ageInMinutes)} min ago)`);
                } else {
                    // Clear stale results
                    localStorage.removeItem('jobbot_results');
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
                localStorage.setItem('jobbot_profile', JSON.stringify(profileToSave));
            } catch (err) {
                console.error("Failed to save profile:", err);
            }
        }
    }, [profile, experienceYears, jobTitle]);

    // P0-2: Save search results after successful search
    useEffect(() => {
        if (jobs.length > 0 && !isMatching) {
            try {
                localStorage.setItem('jobbot_results', JSON.stringify({
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
        const newSaved = new Set(savedJobIds);
        const jobId = job.apply_url;

        if (newSaved.has(jobId)) {
            newSaved.delete(jobId);
        } else {
            newSaved.add(jobId);
        }

        setSavedJobIds(new Set(newSaved));
        localStorage.setItem('jobbot_saved_jobs', JSON.stringify(Array.from(newSaved)));
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

        // Scroll to results area so loading state is visible
        // setTimeout(() => {
        //     resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // }, 100);

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
                        location: locationQuery
                    }
                })
            });

            if (!res.ok) throw new Error('Failed to fetch jobs');

            const data = await res.json();
            const initialMatches = data.matches || [];

            // Set initial jobs immediately (Heuristic match)
            setJobs(initialMatches);
            addLog(`Found ${data.total} jobs, ${initialMatches.length} heuristic matches`);

            // ---- START DEEP ANALYSIS (Top 20) ----
            if (initialMatches.length > 0) {
                const top20 = initialMatches.slice(0, 20);
                addLog(`🤖 AI Agent: Starting deep analysis on top ${top20.length} candidates...`);

                // Process in chunks of 4 to avoid rate limits/timeouts
                const chunkSize = 4;
                let processedJobs = [...initialMatches]; // Clone to update

                // Helper to update state safely
                const updateJobWithAnalysis = (jobId, analysis) => {
                    setJobs(currentJobs => {
                        return currentJobs.map(j => {
                            if (j.id === jobId || j.apply_url === jobId) {
                                return { ...j, analysis, match_score: analysis.fit_score || j.match_score };
                            }
                            return j;
                        })
                            .filter(j => {
                                // FILTER OUT: Only hide jobs with AI score < 35 (truly irrelevant/extreme experience gap)
                                if (j.analysis?.fit_score && j.analysis.fit_score < 35) {
                                    return false; // Remove from feed
                                }
                                return true;
                            })
                            .sort((a, b) => {
                                // Sort by AI score if available, else standard score
                                const scoreA = a.analysis?.fit_score || a.match_score;
                                const scoreB = b.analysis?.fit_score || b.match_score;
                                return scoreB - scoreA;
                            });
                    });
                };

                // Process chunks
                for (let i = 0; i < top20.length; i += chunkSize) {
                    const chunk = top20.slice(i, i + chunkSize);
                    addLog(`Analyzing batch ${i / chunkSize + 1}/${Math.ceil(top20.length / chunkSize)}...`);

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

                    await Promise.all(promises); // Wait for chunk to finish before next (pacing)
                }

                addLog("✨ AI Curation Complete. Jobs sorted by Fit Score.");
            }
            // ---- END DEEP ANALYSIS ----

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
        if (confirm('Clear all saved data including profile and results?')) {
            localStorage.removeItem('jobbot_profile');
            localStorage.removeItem('jobbot_results');
            localStorage.removeItem('jobbot_saved_jobs');
            setProfile(null);
            setJobs([]);
            setSavedJobIds(new Set());
            setExperienceYears(2);
            setJobTitle('');
            addLog('All data cleared');
        }
    };

    const displayedJobs = (() => {
        let list = activeTab === 'saved'
            ? jobs.filter(j => savedJobIds.has(j.apply_url))
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
                            <span>Anonymous & Secure: No email, no stored resume.</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-white/60 p-2 rounded-lg border border-gray-100 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Deep Scan: Takes 1-2 mins for best results.</span>
                        </div>
                    </div>

                    <ResumeStrength profile={profile} />

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

                                        {!preferences.remoteOnly && states.length > 0 && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                <Combobox
                                                    options={states}
                                                    value={preferences.state}
                                                    onChange={(val) => setPreferences(prev => ({ ...prev, state: val }))}
                                                    placeholder="Select State/Province..."
                                                    searchPlaceholder="Search states..."
                                                />
                                            </motion.div>
                                        )}

                                        {!preferences.remoteOnly && cities.length > 0 && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                <Combobox
                                                    options={cities}
                                                    value={preferences.city}
                                                    onChange={(val) => setPreferences(prev => ({ ...prev, city: val }))}
                                                    placeholder="Select City (Optional)"
                                                    searchPlaceholder="Search cities..."
                                                />
                                            </motion.div>
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
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <Button onClick={() => setProfile(null)} variant="outline" size="sm" className="w-1/3 text-xs border-gray-200 text-gray-600 hover:bg-gray-50">Reset</Button>
                                        <Button onClick={findJobs} isLoading={isMatching} className="w-2/3 text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                                            Initialize Scan
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
                        {isMatching && (
                            <ScanningRadar />
                        )}

                        {searchError && !isMatching && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
                            >
                                <div className="text-amber-500 mt-0.5 text-lg">{searchError.type === 'resume' ? '📄' : '⚠️'}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-amber-800 font-medium">{searchError.message}</p>
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
                        )}

                        {!isMatching && displayedJobs.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-20 px-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50/50"
                            >
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                                    {activeTab === 'saved' ? (
                                        <Bookmark className="w-8 h-8 text-gray-300" />
                                    ) : (
                                        <Search className="w-8 h-8 text-gray-300" />
                                    )}
                                </div>
                                <h3 className="text-gray-900 font-medium mb-1">
                                    {activeTab === 'saved' ? 'No Saved Jobs Yet' : 'Ready to Hunt'}
                                </h3>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
                                    {activeTab === 'saved'
                                        ? 'Jobs you bookmark will appear here for easy access.'
                                        : 'Upload your resume context above to activate the autonomous agent.'}
                                </p>
                            </motion.div>
                        )}

                        <AnimatePresence>
                            {displayedJobs.map((job, i) => (
                                <JobCard
                                    key={i}
                                    job={job}
                                    profile={profile}
                                    apiKeys={apiKeys}
                                    onSave={toggleSaveJob}
                                    isSaved={savedJobIds.has(job.apply_url)}
                                />
                            ))}
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
                                <div className="text-sm font-semibold text-gray-900 mb-1">Scanning Job Market...</div>
                                <div className="text-[11px] text-gray-500 truncate">
                                    {logs.length > 0 ? logs[logs.length - 1].message : 'Initializing search agent...'}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent pointer-events-none" />
            <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent pointer-events-none" />
        </div>
    );
}
