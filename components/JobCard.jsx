import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { MapPin, Calendar, Building2, ExternalLink, ChevronDown, Check, Bookmark, Sparkles, BrainCircuit } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from './ui/Button';
import { MatchRing } from './ui/MatchRing';

export function JobCard({ job, profile, apiKeys, onSave, isSaved }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

    // 3D Tilt Logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const handleSaveWrapper = () => {
        onSave(job);
        if (!isSaved && job.match_score >= 80) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#3b82f6', '#fbbf24']
            });
        }
    };

    // Formatting helpers
    const postedDate = job.date_posted ? new Date(job.date_posted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently';

    // HTML Sanitization
    const stripHtml = (html) => {
        if (!html) return '';
        // Replace <br> with newlines, then strip tags
        const noTags = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
        // Decode entities briefly if needed, but simplistic strip is usually enough for basic display
        return noTags;
    };

    const cleanTitle = stripHtml(job.title);
    const cleanCompany = stripHtml(job.company);
    const cleanLocation = stripHtml(job.location);
    const cleanSummary = stripHtml(job.summary || job.description);

    // Confidence color logic (Presentation layer only)
    const getMatchColor = (score) => {
        if (score >= 80) return "text-emerald-600";
        if (score >= 60) return "text-blue-600";
        return "text-gray-400";
    };

    const getMatchGradient = (score) => {
        if (score >= 80) return "from-emerald-500 to-teal-500";
        if (score >= 60) return "from-indigo-500 to-purple-500";
        return "from-slate-500 to-slate-600";
    };

    const handleExpandWrapper = async () => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);

        // Fetch analysis only if opening and not yet fetched
        if (nextState && !analysis && !isLoadingAnalysis) {
            setIsLoadingAnalysis(true);
            try {
                const res = await fetch('/api/analyze-job', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ job, profile, apiKeys })
                });
                const data = await res.json();
                if (data.analysis) setAnalysis(data.analysis);
            } catch (err) {
                console.error("Analysis failed", err);
            } finally {
                setIsLoadingAnalysis(false);
            }
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative bg-white border border-gray-200 hover:border-blue-300 rounded-xl transition-all duration-300 hover:shadow-xl shadow-sm perspective-1000"
        >
            {/* Top Glow Line */}
            <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${getMatchGradient(job.match_score)} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="p-5">
                <div className="flex justify-between items-start gap-4">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {cleanTitle}
                            </h3>
                            {job.date_posted && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
                                    {postedDate}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                            <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                {cleanCompany}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {cleanLocation || 'Remote'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-500 border border-gray-200">
                                {job.source}
                            </span>
                        </div>

                        {/* Summary */}
                        <p className={`text-sm text-gray-600 leading-relaxed transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {cleanSummary}
                        </p>
                    </div>

                    {/* Actions & Score */}
                    <div className="flex flex-col items-end gap-3 shrink-0" style={{ transform: "translateZ(20px)" }}>
                        <div className="flex flex-col items-center">
                            <MatchRing score={job.match_score} />
                            <div className="text-[9px] text-gray-400 uppercase tracking-widest font-medium mt-1">Match Fit</div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveWrapper}
                                className={`p-2 rounded-lg border transition-all ${isSaved ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600' : ''}`} />
                            </button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    if (job.apply_url) {
                                        window.open(job.apply_url, '_blank');
                                    } else {
                                        // Fallback: search Google for the job listing
                                        const searchQuery = encodeURIComponent(`${job.title} ${job.company} apply`);
                                        window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
                                    }
                                }}
                                className="bg-gray-900 hover:bg-black text-white border border-transparent shadow-sm"
                            >
                                Apply <ExternalLink className="w-3 h-3 ml-1.5 opacity-50" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Match DNA Bar (Explainability Visualization) */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5">
                            <BrainCircuit className="w-3 h-3 text-blue-500" />
                            AI Match Analysis
                        </span>
                        <button
                            onClick={handleExpandWrapper}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                            {isExpanded ? 'Hide Details' : 'View Deep Analysis'}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                        {/* Visualizing score components without changing logic */}
                        <div className="h-full bg-blue-500" style={{ width: `${job.match_score * 0.6}%` }} />
                        <div className="h-full bg-purple-500" style={{ width: `${job.match_score * 0.3}%` }} />
                        <div className="h-full bg-emerald-500" style={{ width: `${job.match_score * 0.1}%` }} />
                    </div>
                </div>

                {/* Expanded Analysis Panel */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {isLoadingAnalysis ? (
                                    <div className="col-span-2 space-y-2 p-4">
                                        <div className="flex items-center gap-2 text-gray-500 animate-pulse">
                                            <BrainCircuit className="w-4 h-4" />
                                            <span>Analyzing job details against your profile...</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                                        <div className="h-2 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                                    </div>
                                ) : analysis ? (
                                    <>
                                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                            <h4 className="text-emerald-800 font-medium mb-2 flex items-center gap-2">
                                                <Check className="w-3.5 h-3.5" />
                                                Strong Signals
                                            </h4>
                                            <ul className="list-disc list-inside space-y-1 text-emerald-700/80">
                                                {analysis.strong_signals?.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <h4 className="text-blue-800 font-medium mb-2 flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                AI Verdict
                                            </h4>
                                            <p className="text-blue-700/80 mb-2">{analysis.verdict}</p>
                                            <div className="pt-2 border-t border-blue-100 mt-2">
                                                <span className="text-[10px] uppercase tracking-wider text-blue-500 font-bold">Est. Salary: </span>
                                                <span className="text-blue-900 font-medium">{analysis.salary_estimate}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-2 text-center text-gray-400 py-4">
                                        Unable to generate analysis.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
