import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Search, Check, AlertCircle, Loader2, X, Plus, MapPin, Globe, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Combobox } from './ui/Combobox';
import { getAllCountries, getCitiesByCountry, getCountryName } from '../lib/location-data';

export function JobDashboard({ apiKeys, onBack }) {
    const [profile, setProfile] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [logs, setLogs] = useState([]);

    // Preferences State
    const [preferences, setPreferences] = useState({ country: 'US', city: '', remoteOnly: false });
    const [newSkill, setNewSkill] = useState('');

    // Data State
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);

    const fileInputRef = useRef(null);

    // Load countries on mount
    useEffect(() => {
        setCountries(getAllCountries());
    }, []);

    // Load cities when country changes
    useEffect(() => {
        if (preferences.country) {
            setCities(getCitiesByCountry(preferences.country));
            // Reset city if country changes
            setPreferences(prev => ({ ...prev, city: '' }));
        } else {
            setCities([]);
        }
    }, [preferences.country]);

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    // ---- Skill Editing Logic ----
    const handleAddSkill = () => {
        if (!newSkill.trim() || !profile) return;
        // avoid duplicates
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

            // Auto-set country if detected (basic mapping)
            // Just defaulting to US for now as safer default, or user's Resume country if we could map efficiently
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
        setLogs([]); // Clear previous logs
        addLog("Starting job search agent...");

        // Format location string
        let locationQuery = '';
        if (!preferences.remoteOnly) {
            const countryName = getCountryName(preferences.country);
            if (preferences.city) {
                locationQuery = `${preferences.city}, ${countryName}`;
            } else {
                locationQuery = countryName;
            }
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

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 container mx-auto text-white">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8"
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
                    {/* Glassmorphic Card */}
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
                                    <label className="text-[10px] tracking-widest text-indigo-300/70 uppercase font-semibold mb-1 block">Identity</label>
                                    <div className="font-semibold text-lg text-white">{profile.name}</div>
                                    <div className="text-sm text-white/60 truncate">{profile.headline}</div>
                                </div>

                                {/* Skills Editor */}
                                <div>
                                    <label className="text-[10px] tracking-widest text-indigo-300/70 uppercase font-semibold mb-2 block">Skills Matrix</label>
                                    <div className="flex flex-wrap gap-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar p-1 -m-1">
                                        {profile.skills.map(s => (
                                            <span key={s} className="text-xs px-2.5 py-1 rounded-md bg-white/10 border border-white/10 flex items-center gap-1.5 group/skill hover:bg-white/15 hover:border-white/20 transition-all">
                                                {s}
                                                <button
                                                    onClick={() => handleRemoveSkill(s)}
                                                    className="text-white/40 hover:text-red-400 transition-colors"
                                                >
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
                                            placeholder="Add a missing skill..."
                                            className="w-full bg-transparent border-none text-xs px-3 py-2 focus:outline-none text-white placeholder:text-white/20"
                                        />
                                        <button
                                            onClick={handleAddSkill}
                                            disabled={!newSkill.trim()}
                                            className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                {/* Search Targets */}
                                <div>
                                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-indigo-400" />
                                        Broadcasting Range
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] text-white/40 uppercase mb-1.5 block">Target Country</label>
                                            <Combobox
                                                options={countries}
                                                value={preferences.country}
                                                onChange={(val) => setPreferences(prev => ({ ...prev, country: val }))}
                                                placeholder="Select Country..."
                                                searchPlaceholder="Search countries..."
                                            />
                                        </div>

                                        {!preferences.remoteOnly && cities.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                            >
                                                <label className="text-[10px] text-white/40 uppercase mb-1.5 block">Target City</label>
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
                                            className={
                                                `flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${preferences.remoteOnly
                                                    ? 'bg-indigo-500/10 border-indigo-500/30'
                                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                                }`
                                            }
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

                    {/* Terminal Logs */}
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
                <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Search className="w-5 h-5 text-indigo-400" />
                            Matched Opportunities
                            {jobs.length > 0 && <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-white/60 font-normal">{jobs.length}</span>}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {jobs.length === 0 && !isMatching && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-32 bg-white/5 rounded-3xl border border-white/5 dashed-border"
                            >
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Search className="w-8 h-8 text-white/20" />
                                </div>
                                <h3 className="text-lg font-medium text-white/50 mb-2">Targeting System Offline</h3>
                                <p className="text-sm text-white/30 max-w-sm mx-auto">Upload a resume dossier to begin the job matching sequence.</p>
                            </motion.div>
                        )}

                        <AnimatePresence>
                            {jobs.map((job, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <div className="group relative bg-[#0A0A0A] border border-white/10 hover:border-indigo-500/30 rounded-xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] hover:-translate-y-1">
                                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors mb-2">
                                                    <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-indigo-500/50 underline-offset-4">
                                                        {job.title}
                                                    </a>
                                                </h3>

                                                <div className="flex flex-wrap items-center gap-3 text-xs text-white/50 mb-4">
                                                    <span className="flex items-center gap-1 text-white/70">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                        {job.company}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {job.location || 'Remote'}
                                                    </span>
                                                    {job.date_posted && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-white/30">Posted {new Date(job.date_posted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                        </>
                                                    )}
                                                </div>

                                                <p className="text-sm text-white/60 line-clamp-2 leading-relaxed mb-4 pl-3 border-l-2 border-white/5 group-hover:border-indigo-500/30 transition-colors">
                                                    {job.summary}
                                                </p>

                                                <div className="flex gap-2">
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                                                        {job.match_score}% Compatibility
                                                    </span>
                                                    <span className="text-[10px] font-medium px-2 py-1 rounded bg-white/5 text-white/40 border border-white/5 uppercase tracking-wider">
                                                        {job.source}
                                                    </span>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                onClick={() => window.open(job.apply_url, '_blank')}
                                                className="shrink-0 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-lg backdrop-blur-sm"
                                            >
                                                Apply Now
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Background Gradients */}
            <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent pointer-events-none" />
            <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent pointer-events-none" />
        </div>
    );
}
