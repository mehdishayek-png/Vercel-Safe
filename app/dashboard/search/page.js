'use client';
import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ChevronDown, Sparkles } from 'lucide-react';
import { MatchResultsGrid } from '@/components/MatchResultsGrid';
import { OnboardingPanel } from '@/components/dashboard/OnboardingPanel';
import { CandidatePanel } from '@/components/dashboard/CandidatePanel';
import { ScanControls } from '@/components/dashboard/ScanControls';
import { useProfileStore } from '@/stores/profile-store';
import { useSearchStore } from '@/stores/search-store';
import { useJobsStore } from '@/stores/jobs-store';
import { trackResumeUpload } from '@/lib/gtag';
import { useState, useEffect } from 'react';

export default function SearchPage() {
    const resultsRef = useRef(null);

    const [newSkill, setNewSkill] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [readinessOpen, setReadinessOpen] = useState(false);

    const {
        profile, setProfile, isParsing, setIsParsing,
        experienceYears, setExperienceYears, jobTitle, setJobTitle,
        whatIDo, setWhatIDo, fileInputRef, apiKeys,
    } = useProfileStore();
    const {
        jobs, setJobs, isMatching, setIsMatching,
        searchError, setSearchError, logs, setLogs, addLog,
        activeTab, setActiveTab, sortBy, setSortBy,
        deepAnalysisProgress, setDeepAnalysisProgress,
        preferences, setPreferences, hasSearched, setHasSearched
    } = useSearchStore();
    const {
        savedJobIds, savedJobsData, toggleSaveJob,
        toggleAppliedJob, appliedJobIds,
    } = useJobsStore();
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

            setProfile(data.profile);
            if (typeof data.profile.experience_years === 'number') setExperienceYears(data.profile.experience_years);
            if (data.profile.headline) setJobTitle(data.profile.headline);
            if (data.whatIDo) setWhatIDo(data.whatIDo);


            addLog(`Profile extracted for ${data.profile.name}`);
            trackResumeUpload();
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

    const handleQuickStart = (title, skillsArray, locationQuery = '') => {
        setJobs([]);
        try { localStorage.removeItem('midas_results'); } catch {}
        
        const mockProfile = {
            name: 'Guest',
            headline: title,
            skills: skillsArray,
            experience_years: 0,
            location: locationQuery
        };
        
        setProfile(mockProfile);
        setJobTitle(title);
        
        if (locationQuery) {
            setPreferences(prev => ({ 
                ...prev, 
                location: locationQuery, 
                remoteOnly: locationQuery.toLowerCase().includes('remote') 
            }));
        }
        
        // Let the store settle, then trigger search
        setTimeout(() => {
            const scanBtn = document.getElementById('scan-btn');
            if (scanBtn) scanBtn.click();
        }, 500);
    };

    useEffect(() => {
        // Auto-scroll on mobile when matching starts
        if (isMatching && window.innerWidth < 1024 && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isMatching]);

    useEffect(() => {
        // Intercept ?q= and ?loc= from hero input
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        const loc = params.get('loc');
        
        if (q && !profile) {
            // clear the URL param without full reload
            window.history.replaceState({}, '', '/dashboard/search');
            handleQuickStart(q, ['Communication', 'Problem Solving'], loc || '');
        }
    }, []);

    const findJobs = async (forceRefresh = false) => {
        if (!profile) return;
        if (!preferences.location?.trim()) {
            setSearchError({ type: 'location', message: 'Please enter a location to search. Try a city like "London" or "Mumbai".' });
            return;
        }
        setIsMatching(true);
        setHasSearched(true);
        // Don't clear previous jobs — new results will merge in via streaming
        setLogs([]);
        setSearchError(null);
        addLog("Starting job search agent...");
        addLog("Streaming results as sources respond...");
        setActiveTab('matches');
        const searchStartedAt = Date.now();

        // Token gating removed — all signed-in users have unlimited access.

        let locationQuery = '';
        if (!preferences.remoteOnly && preferences.location) {
            locationQuery = preferences.location.trim();
        }

        try {
            // Use streaming endpoint — results populate as each source completes
            const res = await fetch('/api/match-jobs-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: { ...profile, experience_years: experienceYears, headline: jobTitle, whatIDo },
                    preferences: { ...preferences, location: locationQuery, forceRefresh }
                })
            });

            // Handle non-streaming error responses (auth, rate-limit, validation)
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 429) throw new Error(errData.error || 'Rate limit reached.');
                if (res.status === 401 && errData.requiresAuth) {
                    setSearchError({
                        type: 'auth',
                        message: 'Sign in to search and keep your profile and shortlist available across devices.',
                        requiresAuth: true,
                    });
                    setIsMatching(false); return;
                }
                if (res.status === 403) {
                    setSearchError({
                        type: 'request',
                        message: errData.error || 'This search could not be started. Please refresh and try again.',
                        canRetry: true,
                    });
                    setIsMatching(false); return;
                }
                throw new Error(errData.error || 'Failed to fetch jobs');
            }

            // Consume SSE stream — populate results progressively
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            // Seed with existing job URLs to avoid duplicates across scans
            const seenUrls = new Set(jobs.map(j => j.apply_url).filter(Boolean));
            let totalSourceJobs = 0;
            let completionSummary = null;
            let activeRunId = null;
            let streamedJobs = [];

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

                        if (event.type === 'started') {
                            activeRunId = event.runId || null;
                        } else if (event.type === 'progress') {
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
                            })); // The server already applies the family-aware display threshold.

                            if (newJobs.length > 0) {
                                totalSourceJobs += newJobs.length;
                                streamedJobs = [...streamedJobs, ...newJobs];
                                addLog(`+${newJobs.length} from ${event.source} (${totalSourceJobs} total)`);
                                // Merge and sort by score
                                setJobs(prev => {
                                    const merged = [...prev, ...newJobs];
                                    return merged.sort((a, b) =>
                                        (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0)
                                    );
                                });
                            }
                        } else if (event.type === 'rerank') {
                            // Semantic refinement: patch scores for the top candidates and re-sort.
                            const updateByUrl = new Map((event.jobs || []).map(u => [u.apply_url, u]));
                            streamedJobs = streamedJobs.map(j => {
                                const update = updateByUrl.get(j.apply_url);
                                return update ? { ...j, match_score: update.score, heuristic_breakdown: update.breakdown || j.heuristic_breakdown } : j;
                            });
                            addLog(`Refined ${event.jobs?.length || 0} matches with semantic ranking`);
                            setJobs(prev => prev.map(j => {
                                const u = updateByUrl.get(j.apply_url);
                                if (!u) return j;
                                return { ...j, match_score: u.score, heuristic_breakdown: u.breakdown || j.heuristic_breakdown };
                            }).sort((a, b) =>
                                (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0)
                            ));
                        } else if (event.type === 'complete') {
                            completionSummary = event;
                            activeRunId = event.runId || activeRunId;
                            addLog(`Search complete: ${event.totalDisplayed ?? totalSourceJobs} matches from ${Object.keys(event.sources || {}).length} sources`);
                        } else if (event.type === 'error') {
                            addLog(`Warning: ${event.message}`);
                            setSearchError({ type: 'search', message: `Search error: ${event.message}`, canRetry: true });
                        }
                    } catch { /* skip malformed SSE lines */ }
                }
            }

            const completedJobs = streamedJobs
                .sort((a, b) => (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0))
                .slice(0, 150);
            if (completedJobs.length > 0) {
                try {
                    await fetch('/api/search-history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            profile: { ...profile, experience_years: experienceYears, headline: jobTitle },
                            preferences: { ...preferences, location: locationQuery },
                            jobs: completedJobs,
                            summary: {
                                runId: activeRunId,
                                sources: completionSummary?.sources || {},
                                totalFetched: completionSummary?.totalUnique || totalSourceJobs,
                                durationMs: Date.now() - searchStartedAt,
                            },
                        }),
                    });
                } catch {
                    // Local result caching remains available if server persistence is unavailable.
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
                    generateSearchSuggestions(jobTitle, profile).then(s => s && setSearchSuggestions(s));
                }

                // Deep analysis now runs on-demand when user clicks "View" on a job
                addLog(`${currentJobs.length} jobs matched. Click "View" on any job for AI deep analysis.`);

                return currentJobs;
            });

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

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-[1280px] w-full search-bg rounded-2xl p-3 md:p-6 -m-3 md:-m-5 min-h-[calc(100vh-100px)]">
            {/* Left Panel */}
            <div className="relative z-10 w-full shrink-0 space-y-4 lg:w-[390px]">
                {!profile && (
                    <>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-900/[0.07] bg-white/80 px-3.5 py-3 text-[11px] text-slate-500 shadow-sm backdrop-blur-xl">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent-600" />
                            Your resume becomes an editable, private match profile.
                        </div>
                        <OnboardingPanel isParsing={isParsing} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} handleQuickStart={handleQuickStart} />
                    </>
                )}

                {profile && (
                    <section className="relative overflow-hidden rounded-[24px] border border-slate-900/10 bg-white shadow-[0_22px_60px_-34px_rgba(24,31,46,0.42)] before:absolute before:bottom-0 before:left-0 before:top-0 before:z-20 before:w-1 before:bg-gradient-to-b before:from-brand-600 before:via-brand-400 before:to-accent-500">
                        <header className="border-b border-slate-900/[0.07] bg-gradient-to-r from-surface-50 to-white px-5 py-4 sm:px-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-700">Search brief</p>
                                    <p className="mt-1 text-[11px] text-slate-500">The signals your ranking engine will use.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReadinessOpen(!readinessOpen)}
                                    aria-expanded={readinessOpen}
                                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-accent-200 bg-accent-50 px-2.5 py-2 text-[10px] font-bold text-accent-700 transition-colors hover:bg-accent-100"
                                >
                                    <span className="grid h-4 w-4 place-items-center rounded-full bg-accent-600 text-[9px] text-white">✓</span>
                                    {readinessScore}% ready
                                    <ChevronDown className={`h-3 w-3 transition-transform ${readinessOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {readinessOpen && (
                                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-900/[0.07] pt-3">
                                    {readinessChecks.map((check) => (
                                        <div key={check.label} className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
                                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${check.passed ? 'bg-accent-500' : 'bg-slate-300'}`} />
                                            <span className="truncate">{check.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </header>

                        <CandidatePanel
                            profile={profile} jobTitle={jobTitle} setJobTitle={setJobTitle}
                            isEditingTitle={isEditingTitle} setIsEditingTitle={setIsEditingTitle}
                            newSkill={newSkill} setNewSkill={setNewSkill}
                            handleAddSkill={handleAddSkill} handleRemoveSkill={handleRemoveSkill}
                        />

                        <ScanControls
                            experienceYears={experienceYears} setExperienceYears={setExperienceYears}
                            preferences={preferences} setPreferences={setPreferences}
                            isMatching={isMatching}
                            findJobs={findJobs} onReset={() => setProfile(null)}
                        />
                    </section>
                )}

                {/* Activity log removed — internal/dev only */}
            </div>

            {/* Right Panel — Results */}
            <div className="flex-1 min-w-0 relative z-10" ref={resultsRef}>
                <MatchResultsGrid
                    jobs={jobs} activeTab={activeTab} setActiveTab={setActiveTab} sortBy={sortBy} setSortBy={setSortBy}
                    displayedJobs={displayedJobs} isMatching={isMatching} searchError={searchError} setSearchError={setSearchError}
                    hasSearched={hasSearched}
                    deepAnalysisProgress={deepAnalysisProgress} savedJobIds={savedJobIds} profile={profile} apiKeys={apiKeys}
                    toggleSaveJob={toggleSaveJob} toggleAppliedJob={toggleAppliedJob} appliedJobIds={appliedJobIds}
                    findJobs={findJobs}
                    searchSuggestions={searchSuggestions} onSuggestionClick={(title) => { setJobTitle(title); setSearchSuggestions(null); }}
                    activity={logs.length > 0 ? logs[logs.length - 1].message : ''}
                />
            </div>

            {/* Loading Toast */}
            <AnimatePresence>
                {isMatching && (
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 glass-panel backdrop-blur-xl border border-transparent rounded-[2rem] px-5 py-3 shadow-elevated max-w-sm w-[85vw]"
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
