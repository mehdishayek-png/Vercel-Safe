'use client';

import { useState } from 'react';
import { Bot, Sparkles, Scale, Search, Code, MapPin, Building2, Calendar, Target } from 'lucide-react';

export default function PandaSandbox() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const [profile, setProfile] = useState({
        headline: 'Senior Web Developer',
        experience_years: 5,
        skills: 'React, Next.js, TypeScript, Node.js, Tailwind',
    });

    const [locationPref, setLocationPref] = useState({
        city: 'San Francisco',
        state: 'CA',
        country: 'United States'
    });

    const [job, setJob] = useState({
        title: 'Lead Frontend Engineer',
        company: 'Google',
        location: 'San Francisco, CA',
        date_posted: new Date().toISOString().split('T')[0],
        summary: 'We are looking for a Lead Frontend Engineer with deep expertise in React, Next.js, and TypeScript to architect our new core systems. Minimum 5 years experience required. Generous compensation.'
    });

    const handleTest = async () => {
        setLoading(true);
        setResult(null);
        try {
            const payload = {
                profile: {
                    ...profile,
                    skills: profile.skills.split(',').map(s => s.trim())
                },
                preferences: locationPref,
                job: job
            };

            const res = await fetch('/api/panda-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.result) {
                setResult(data.result);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center space-x-4 border-b border-white/10 pb-6">
                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                        <Bot className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white/90">Project Panda Sandbox</h1>
                        <p className="text-white/50">Next-Gen Dota 2 Inspired Heuristic Engine</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Form Inputs */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Candidate Profile Panel */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                            <h2 className="text-xl font-semibold flex items-center space-x-2">
                                <Target className="w-5 h-5 text-emerald-400" />
                                <span>Candidate Profile</span>
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-white/60 font-medium">Headline / Target Role</label>
                                    <input type="text" value={profile.headline} onChange={e => setProfile({ ...profile, headline: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-white/60 font-medium">Years of Experience</label>
                                    <input type="number" value={profile.experience_years} onChange={e => setProfile({ ...profile, experience_years: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs text-white/60 font-medium">Skills (Comma separated)</label>
                                    <textarea value={profile.skills} onChange={e => setProfile({ ...profile, skills: e.target.value })} rows={2} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>

                                <div className="col-span-2 grid grid-cols-3 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-white/60 font-medium">Pref City</label>
                                        <input type="text" value={locationPref.city} onChange={e => setLocationPref({ ...locationPref, city: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-white/60 font-medium">Pref State</label>
                                        <input type="text" value={locationPref.state} onChange={e => setLocationPref({ ...locationPref, state: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-white/60 font-medium">Pref Country</label>
                                        <input type="text" value={locationPref.country} onChange={e => setLocationPref({ ...locationPref, country: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Target Job Panel */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                            <h2 className="text-xl font-semibold flex items-center space-x-2">
                                <Search className="w-5 h-5 text-rose-400" />
                                <span>Target Job</span>
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs text-white/60 font-medium">Job Title</label>
                                    <input type="text" value={job.title} onChange={e => setJob({ ...job, title: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-white/60 font-medium">Company</label>
                                    <input type="text" value={job.company} onChange={e => setJob({ ...job, company: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-white/60 font-medium">Location</label>
                                    <input type="text" value={job.location} onChange={e => setJob({ ...job, location: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs text-white/60 font-medium">Date Posted (Affects Recency Decay)</label>
                                    <input type="date" value={job.date_posted} onChange={e => setJob({ ...job, date_posted: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs text-white/60 font-medium">Job Summary / Description</label>
                                    <textarea value={job.summary} onChange={e => setJob({ ...job, summary: e.target.value })} rows={4} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleTest}
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_-5px_rgba(99,102,241,0.6)] disabled:opacity-50"
                        >
                            <Sparkles className="w-5 h-5" />
                            <span>{loading ? 'Running Panda Analysis...' : 'Simulate Match'}</span>
                        </button>
                    </div>

                    {/* Right Column: Output Metrics */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-6 sticky top-6">
                            <h2 className="text-lg font-semibold flex items-center space-x-2 mb-6 text-indigo-200">
                                <Scale className="w-5 h-5" />
                                <span>Panda Telemetry</span>
                            </h2>

                            {result ? (
                                <div className="space-y-6">
                                    {/* Final Score */}
                                    <div className="text-center p-6 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <p className="text-sm text-white/50 mb-2 uppercase tracking-widest">Final Match Score</p>
                                        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                            {result.score}
                                        </div>
                                    </div>

                                    {/* Multipliers */}
                                    <div className="space-y-3">
                                        <p className="text-xs text-white/50 uppercase tracking-widest font-semibold pb-2 border-b border-white/10">Compounding Multipliers</p>

                                        <MultiplierRow label="Seniority Check" val={result.multipliers.seniority} color="text-amber-400" />
                                        <MultiplierRow label="Recency Decay" val={result.multipliers.recency} color="text-emerald-400" />
                                        <MultiplierRow label="Prestige Buff" val={result.multipliers.prestige} color="text-purple-400" />
                                        <MultiplierRow label="Localization" val={result.multipliers.location} color="text-sky-400" />
                                        <MultiplierRow label="Language Quality" val={result.multipliers.quality} color="text-zinc-400" />
                                    </div>

                                    {/* Keyword Raw Score */}
                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <p className="text-xs text-white/50 uppercase tracking-widest font-semibold pb-2 border-b border-white/10">Information Density</p>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-white/70">Raw Keyword Weight</span>
                                            <span className="font-mono text-white">{result.raw}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {result.matches.map((m, i) => (
                                                <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono flex items-center space-x-1">
                                                    <span className="text-white/80">{m.skill}</span>
                                                    <span className="text-indigo-400">+{m.value}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-white/30 space-y-4">
                                    <Scale className="w-12 h-12 stroke-1" />
                                    <p className="text-sm text-center">Run a simulation to see algorithmic telemetry.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function MultiplierRow({ label, val, color }) {
    const num = parseFloat(val);
    const isBuff = num > 1.0;
    const isPenalty = num < 1.0;
    const isNeutral = num === 1.0;

    return (
        <div className="flex justify-between items-center text-sm bg-black/20 p-2.5 rounded-lg border border-white/5">
            <span className="text-white/70">{label}</span>
            <span className={`font-mono font-medium ${isBuff ? 'text-emerald-400' : isPenalty ? 'text-rose-400' : 'text-zinc-400'}`}>
                {val}x
            </span>
        </div>
    );
}
