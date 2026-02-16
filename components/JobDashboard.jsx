import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Search, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

export function JobDashboard({ apiKeys, onBack }) {
    const [profile, setProfile] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [logs, setLogs] = useState([]);
    const [preferences, setPreferences] = useState({ location: '', remoteOnly: false });
    const fileInputRef = useRef(null);

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

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

    const findJobs = async () => {
        if (!profile) return;
        setIsMatching(true);
        setLogs([]); // Clear previous logs
        addLog("Starting job search agent...");

        try {
            const res = await fetch('/api/match-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, apiKeys, preferences })
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
        <div className="min-h-screen pt-24 pb-12 px-4 container mx-auto">
            <Button variant="ghost" onClick={onBack} className="mb-8">← Back to Home</Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Profile & Actions */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            Your Profile
                        </h2>

                        {!profile ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-500/20 transition-colors">
                                    {isParsing ? <Loader2 className="animate-spin text-indigo-400" /> : <Upload className="text-indigo-400" />}
                                </div>
                                <p className="text-sm font-medium">Upload Resume (PDF)</p>
                                <p className="text-xs text-white/40 mt-1">Drag & drop or click to browse</p>
                                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-white/40 uppercase">Name</label>
                                        <div className="font-medium">{profile.name}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/40 uppercase">Headline</label>
                                        <div className="font-medium">{profile.headline}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/40 uppercase">Skills</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {profile.skills.slice(0, 8).map(s => (
                                                <span key={s} className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Search Preferences */}
                                <div className="pt-4 border-t border-white/10 space-y-3">
                                    <h3 className="text-sm font-medium text-indigo-300">Search Preferences</h3>
                                    <div>
                                        <label className="text-xs text-white/40 uppercase mb-1 block">Location</label>
                                        <Input
                                            placeholder="e.g. San Francisco, CA"
                                            value={preferences.location}
                                            onChange={(e) => setPreferences(prev => ({ ...prev, location: e.target.value }))}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPreferences(prev => ({ ...prev, remoteOnly: !prev.remoteOnly }))}>
                                        <div className={`w-4 h-4 rounded border ${preferences.remoteOnly ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'} flex items-center justify-center transition-colors`}>
                                            {preferences.remoteOnly && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm text-white/70 select-none">Remote / Worldwide only</span>
                                    </div>

                                    <div className="pt-2 flex gap-2">
                                        <Button onClick={() => setProfile(null)} variant="outline" size="sm" className="w-full">Reset</Button>
                                        <Button onClick={findJobs} isLoading={isMatching} size="sm" className="w-full">Find Jobs</Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Logs Console */}
                    <Card className="p-4 h-64 overflow-y-auto font-mono text-xs bg-black/40 border-white/5">
                        <div className="text-white/30 mb-2 uppercase tracking-widest sticky top-0 bg-[#0A0A0A] pb-2">Agent Logs</div>
                        {logs.length === 0 && <div className="text-white/20 italic">Waiting for activity...</div>}
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 text-green-400/80">&gt; {log}</div>
                        ))}
                    </Card>
                </div>

                {/* Right Col: Job Results */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Search className="w-5 h-5 text-indigo-400" />
                        Matched Jobs
                    </h2>

                    <div className="space-y-4">
                        {jobs.length === 0 && !isMatching && (
                            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
                                <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                <p className="text-white/40">Upload a resume and start matching to see jobs here.</p>
                            </div>
                        )}

                        <AnimatePresence>
                            {jobs.map((job, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card hover className="p-6 group">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-indigo-300 group-hover:text-indigo-400 transition-colors">
                                                    <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                        {job.title}
                                                    </a>
                                                </h3>
                                                <div className="text-sm text-white/60 mb-2 flex flex-wrap gap-x-3 gap-y-1">
                                                    <span>{job.company}</span>
                                                    <span className="text-white/20">•</span>
                                                    <span>{job.location || 'Remote'}</span>
                                                    {job.date_posted && (
                                                        <>
                                                            <span className="text-white/20">•</span>
                                                            <span className="text-white/40">{new Date(job.date_posted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 mb-3">
                                                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                                        {job.match_score}% Match
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
                                                        {job.source}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="secondary" onClick={() => window.open(job.apply_url, '_blank')}>
                                                Apply
                                            </Button>
                                        </div>
                                        <p className="text-sm text-white/50 line-clamp-2">{job.summary}</p>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
