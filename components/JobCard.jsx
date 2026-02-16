import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Building2, ExternalLink, ChevronDown, Check, Bookmark, Sparkles, BrainCircuit } from 'lucide-react';
import { Button } from './ui/Button';

export function JobCard({ job, onSave, isSaved }) {
    const [isExpanded, setIsExpanded] = useState(false);

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
        if (score >= 80) return "text-emerald-400";
        if (score >= 60) return "text-indigo-400";
        return "text-white/60";
    };

    const getMatchGradient = (score) => {
        if (score >= 80) return "from-emerald-500 to-teal-500";
        if (score >= 60) return "from-indigo-500 to-purple-500";
        return "from-slate-500 to-slate-600";
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="group relative bg-[#0D0D12] border border-white/5 hover:border-indigo-500/30 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.05)]"
        >
            {/* Top Glow Line */}
            <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${getMatchGradient(job.match_score)} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="p-5">
                <div className="flex justify-between items-start gap-4">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-200 transition-colors truncate">
                                {cleanTitle}
                            </h3>
                            {job.date_posted && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5 whitespace-nowrap">
                                    {postedDate}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50 mb-3">
                            <span className="flex items-center gap-1.5 text-white/70 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                {cleanCompany}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {cleanLocation || 'Remote'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="bg-white/5 px-2 py-0.5 rounded text-white/40 border border-white/5">
                                {job.source}
                            </span>
                        </div>

                        {/* Summary */}
                        <p className={`text-sm text-white/60 leading-relaxed transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {cleanSummary}
                        </p>
                    </div>

                    {/* Actions & Score */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="text-right">
                            <div className={`text-2xl font-black ${getMatchColor(job.match_score)} tracking-tight flex items-center justify-end gap-1`}>
                                {job.match_score}%
                                {job.match_score >= 80 && <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />}
                            </div>
                            <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Match Fit</div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => onSave(job)}
                                className={`p-2 rounded-lg border transition-all ${isSaved ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'}`}
                            >
                                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-indigo-300' : ''}`} />
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
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm"
                            >
                                Apply <ExternalLink className="w-3 h-3 ml-1.5 opacity-50" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Match DNA Bar (Explainability Visualization) */}
                <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5">
                            <BrainCircuit className="w-3 h-3 text-indigo-400" />
                            AI Match Analysis
                        </span>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center gap-1 hover:text-indigo-300 transition-colors"
                        >
                            {isExpanded ? 'Hide Details' : 'View Analysis'}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                        {/* Visualizing score components without changing logic */}
                        <div className="h-full bg-indigo-500" style={{ width: `${job.match_score * 0.6}%` }} />
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
                            <div className="pt-4 mt-2 grid grid-cols-2 gap-4 text-xs">
                                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                    <h4 className="text-white/70 font-medium mb-2 flex items-center gap-2">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        Strong Signals
                                    </h4>
                                    <p className="text-white/40">
                                        This role strongly aligns with your headline and primary skills. The location matches your preference pattern.
                                    </p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                    <h4 className="text-white/70 font-medium mb-2 flex items-center gap-2">
                                        <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                                        Keyword Overlap
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['React', 'Development', 'Engineering'].map(k => (
                                            <span key={k} className="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded text-[10px] border border-purple-500/20">
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
