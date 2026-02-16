import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Search, Check, AlertCircle, Loader2, X, Plus, MapPin, Globe, Sparkles, Bookmark, LayoutGrid, List } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Combobox } from './ui/Combobox';
import { JobCard } from './JobCard';
import { ResumeStrength } from './ResumeStrength';
import { ScanningRadar } from './ScanningRadar';
import { getAllCountries, getStatesByCountry, getCitiesByState, getCountryName } from '../lib/location-data';

export function JobDashboard({ apiKeys, onBack }) {
    const [profile, setProfile] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [logs, setLogs] = useState([]);
    const [savedJobIds, setSavedJobIds] = useState(new Set());
    const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'saved'

    // Preferences State
    const [preferences, setPreferences] = useState({ country: 'US', state: '', city: '', remoteOnly: false });
    const [newSkill, setNewSkill] = useState('');

    // Data State
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    const fileInputRef = useRef(null);
    const resultsRef = useRef(null);

    // Load countries on mount
    useEffect(() => {
        setCountries(getAllCountries());
        const saved = localStorage.getItem('jobbot_saved_jobs');
        if (saved) {
            setSavedJobIds(new Set(JSON.parse(saved)));
        }
    }, []);

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

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

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
            addLog(`Extracted profile for ${data.profile.name}`);
        } catch (err) {
            addLog(`Error: ${err.message}`);
        } finally {
            setIsParsing(false);
        }
    };

    // ---- Job Search ----
    const findJobs = async () => {
        if (!profile) return;
        setIsMatching(true);
        setLogs([]);
        addLog("Starting job search agent...");
        setActiveTab('matches');

        // Scroll to results area so loading state is visible
        setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

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
                    profile,
                    apiKeys,
                    preferences: {
                        ...preferences,
                        location: locationQuery
                    }
                })
            });

            if (!res.ok) throw new Error('Failed to fetch jobs');

            const data = await res.json();
            setJobs(data.matches || []);
            addLog(`Found ${data.total} jobs, ${data.matches?.length} matches`);
        } catch (err) {
            addLog(`Error: ${err.message}`);
        } finally {
            setIsMatching(false);
        }
    };

    const displayedJobs = activeTab === 'saved'
        ? jobs.filter(j => savedJobIds.has(j.apply_url))
        : jobs;

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 container mx-auto text-white">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8 flex justify-between items-center"
            >
                <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white">← Back to Home</Button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ---- Left Sidebar: Profile & Controls ---- */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-4 space-y-6"
                >
                    <ResumeStrength profile={profile} />

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            Commander Profile
                        </h2>

                        {!profile ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all group/upload relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-indigo-500/5 scale-0 group-hover/upload:scale-100 transition-transform duration-500 rounded-xl origin-center" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover/upload:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
                                        {isParsing ? <Loader2 className="animate-spin text-indigo-400" /> : <Upload className="text-indigo-400 w-6 h-6" />}
                                    </div>
                                    <p className="text-base font-medium text-white">Upload Resume</p>
                                    <p className="text-xs text-white/40 mt-1">PDF Only • Max 10MB</p>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                            </div>
                        ) : (
                            <div className="space-y-6 relative z-10">
                                {/* Identity */}
                                <div>
                                    <div className="font-semibold text-lg text-white">{profile.name}</div>
                                    <div className="text-sm text-white/60 truncate">{profile.headline}</div>
                                </div>

                                {/* Skills */}
                                <div>
                                    <label className="text-[10px] tracking-widest text-indigo-300/70 uppercase font-semibold mb-2 block">Skills Matrix</label>
                                    <div className="flex flex-wrap gap-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar p-1 -m-1">
                                        {profile.skills.map(s => (
                                            <span key={s} className="text-xs px-2.5 py-1 rounded-md bg-white/10 border border-white/10 flex items-center gap-1.5 group/skill hover:bg-white/15 hover:border-white/20 transition-all">
                                                {s}
                                                <button onClick={() => handleRemoveSkill(s)} className="text-white/40 hover:text-red-400 transition-colors">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/20 rounded-lg pr-1 border border-white/5 focus-within:border-indigo-500/50 transition-colors">
                                        <input
                                            type="text"
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                            placeholder="Add skill..."
                                            className="w-full bg-transparent border-none text-xs px-3 py-2 focus:outline-none text-white placeholder:text-white/20"
                                        />
                                        <button onClick={handleAddSkill} disabled={!newSkill.trim()} className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-white/10" />

                                {/* Targeting */}
                                <div>
                                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-indigo-400" />
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
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${preferences.remoteOnly ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                            onClick={() => setPreferences(prev => ({ ...prev, remoteOnly: !prev.remoteOnly }))}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${preferences.remoteOnly ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'}`}>
                                                {preferences.remoteOnly && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span className="text-xs font-medium text-white/80 select-none">Global Remote Only</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <Button onClick={() => setProfile(null)} variant="outline" size="sm" className="w-1/3 text-xs">Reset</Button>
                                        <Button onClick={findJobs} isLoading={isMatching} className="w-2/3 text-xs bg-indigo-600 hover:bg-indigo-500 border-none shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                                            Initialize Scan
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Logs */}
                    <div className="bg-black/80 backdrop-blur border border-white/10 rounded-xl p-4 h-48 overflow-y-auto font-mono text-[10px] shadow-inner relative">
                        <div className="text-white/20 mb-2 uppercase tracking-widest sticky top-0 bg-black/80 backdrop-blur pb-2 flex justify-between items-center">
                            <span>System Logs</span>
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                            </div>
                        </div>
                        {logs.length === 0 && <div className="text-white/20 italic mt-4 text-center">System standby...</div>}
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 text-green-400/80 break-words border-l border-green-500/20 pl-2">
                                <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                                {log}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* ---- Right Col: Results ---- */}
                <div className="lg:col-span-8" ref={resultsRef}>
                    <div className="sticky top-20 z-30 bg-[#050511]/80 backdrop-blur-xl border border-white/10 rounded-xl p-2 mb-6 flex items-center justify-between shadow-xl">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('matches')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'matches' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4" />
                                    Matches <span className="opacity-50 text-xs">({jobs.length})</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('saved')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'saved' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Bookmark className="w-4 h-4" />
                                    Saved <span className="opacity-50 text-xs">({savedJobIds.size})</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isMatching && (
                            <ScanningRadar />
                        )}

                        {!isMatching && displayedJobs.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-32 bg-white/5 rounded-3xl border border-white/5 dashed-border"
                            >
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Search className="w-8 h-8 text-white/20" />
                                </div>
                                <h3 className="text-lg font-medium text-white/50 mb-2">
                                    {activeTab === 'saved' ? 'No Saved Jobs' : 'Targeting System Offline'}
                                </h3>
                                <p className="text-sm text-white/30 max-w-sm mx-auto">
                                    {activeTab === 'saved'
                                        ? 'Bookmark jobs to view them here later.'
                                        : 'Upload a resume dossier to begin the job matching sequence.'}
                                </p>
                            </motion.div>
                        )}

                        <AnimatePresence>
                            {displayedJobs.map((job, i) => (
                                <JobCard
                                    key={i}
                                    job={job}
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
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0D0D12]/95 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl px-6 py-4 shadow-[0_0_40px_rgba(99,102,241,0.2)] max-w-md w-[90vw]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
                                <Sparkles className="w-4 h-4 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white mb-1">Scanning Job Market...</div>
                                <div className="text-[11px] text-white/50 truncate">
                                    {logs.length > 0 ? logs[logs.length - 1] : 'Initializing search agent...'}
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
