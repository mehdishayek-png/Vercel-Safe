import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';

const TIPS = [
    "Tip: Save jobs you like — it helps us learn your preferences",
    "Tip: Try the Interview Prep page after finding a match",
    "Tip: Use the \"What I Do\" box to improve match accuracy",
    "Tip: Direct career page links skip aggregator sign-up walls",
    "Tip: Your resume is processed in memory and never stored",
];

// We compute nodes differently now to avoid collisions
// (removed standalone jobToNode function)

export function ScanningRadar({ jobs = [] }) {
    const [tipIndex, setTipIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTipIndex(prev => (prev + 1) % TIPS.length), 8000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const { nodes, totalDetected } = useMemo(() => {
        const companyMap = new Map();
        for (const job of jobs) {
            // Aggressive normalization to prevent duplicate entities (e.g. "Salesforce" vs "Salesforce, Inc.")
            const rawName = (job.company || 'Unknown')
                .replace(/\\b(inc|llc|ltd|corp|corporation|company)\\b\\.?/gi, '')
                .replace(/[^a-zA-Z0-9]/g, '')
                .toLowerCase();
                
            const score = job.analysis?.fit_score || job.match_score || 0;
            const existing = companyMap.get(rawName);
            if (!existing || score > (existing.analysis?.fit_score || existing.match_score || 0)) {
                companyMap.set(rawName, job);
            }
        }
        
        const sortedJobs = Array.from(companyMap.values())
            .sort((a, b) => (b.analysis?.fit_score || b.match_score || 0) - (a.analysis?.fit_score || a.match_score || 0));

        // Use a perfectly distributed star pattern to guarantee no overlapping bubbles
        const STAGGERED_ANGLES = [0, 135, 270, 45, 180, 315, 90, 225, 18, 198];
        
        const topNodes = sortedJobs.slice(0, 8).map((job, i) => {
            const score = job.analysis?.fit_score || job.match_score || 0;
            // Radius calculation: closer to 0 (center) the higher the score
            const radius = 380 - ((score - 30) / 70) * 300;
            return {
                company: job.company || 'Unknown',
                score: Math.round(score),
                angle: STAGGERED_ANGLES[i % STAGGERED_ANGLES.length],
                radius: Math.max(70, Math.min(380, radius)),
                source: job.source || '',
            };
        });

        return { nodes: topNodes, totalDetected: companyMap.size };
    }, [jobs]);

    return (
        <div className="flex flex-col items-center justify-center py-6 overflow-hidden relative">
            {/* Radar container */}
            <div className="relative w-[min(100%,500px)] aspect-square flex items-center justify-center mb-6">

                {/* Radar grid rings */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="absolute rounded-full border border-brand-500/20"
                            style={{
                                width: `${i * 25}%`,
                                height: `${i * 25}%`,
                                borderStyle: i % 2 === 0 ? 'dashed' : 'solid'
                            }}
                        />
                    ))}
                    {/* Crosshairs */}
                    <div className="absolute w-full h-[1px] bg-brand-500/15" />
                    <div className="absolute h-full w-[1px] bg-brand-500/15" />
                </div>

                {/* Radar sweep */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 flex items-start justify-center origin-center"
                >
                    {/* Gradient tail */}
                    <div className="absolute inset-0 rounded-full" style={{
                        background: 'conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(79, 70, 229, 0.03) 60%, rgba(139, 92, 246, 0.15) 90%, rgba(251, 191, 36, 0.3) 98%, rgba(251, 191, 36, 0.6) 100%)'
                    }} />
                    {/* Golden leading edge */}
                    <motion.div
                        animate={{
                            boxShadow: [
                                "0 0 15px 2px rgba(251, 191, 36, 0.4)",
                                "0 0 40px 5px rgba(251, 191, 36, 0.8)",
                                "0 0 15px 2px rgba(251, 191, 36, 0.4)"
                            ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-[3px] h-[50%] bg-gradient-to-t from-transparent via-amber-400 to-amber-400 rounded-full origin-bottom relative z-10"
                    />
                </motion.div>

                {/* Floating Job Nodes */}
                <AnimatePresence>
                    {nodes.map((node, i) => {
                        const delay = (node.angle / 360) * 4;
                        // Scale radius to container (container is 100%, radius is in conceptual px, scale to %)
                        const scaledRadius = (node.radius / 500) * 100;
                        const x = scaledRadius * Math.sin(node.angle * Math.PI / 180);
                        const y = -scaledRadius * Math.cos(node.angle * Math.PI / 180);

                        return (
                            <div
                                key={node.company}
                                className="absolute z-20"
                                style={{
                                    left: `calc(50% + ${x}%)`,
                                    top: `calc(50% + ${y}%)`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.3 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.3 }}
                                    transition={{ delay: 0.1, duration: 0.5, type: "spring", bounce: 0.3 }}
                                    className="flex flex-col items-center gap-1.5"
                                >
                                    {/* Node dot */}
                                    <motion.div
                                        animate={{
                                            boxShadow: [
                                                "0px 0px 0px rgba(251, 191, 36, 0)",
                                                "0px 0px 25px 6px rgba(251, 191, 36, 0.6)",
                                                "0px 0px 8px 2px rgba(251, 191, 36, 0.15)"
                                            ],
                                            backgroundColor: ["#4f46e5", "#fbbf24", "#fbbf24"]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, delay, times: [0, 0.1, 1] }}
                                        className="w-3 h-3 rounded-full"
                                    />

                                    {/* Job card */}
                                    <motion.div
                                        animate={{
                                            borderColor: [
                                                "rgba(255, 255, 255, 0.1)",
                                                "rgba(251, 191, 36, 0.6)",
                                                "rgba(255, 255, 255, 0.1)"
                                            ]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, delay, times: [0, 0.1, 1] }}
                                        className="glass-card px-3 py-1.5 rounded-xl border text-center shadow-sm whitespace-nowrap max-w-[140px]"
                                    >
                                        <div className="text-[11px] font-bold text-gray-900 truncate">{node.company}</div>
                                        <div className="text-[10px] font-black text-amber-500">{node.score}%</div>
                                    </motion.div>
                                </motion.div>
                            </div>
                        );
                    })}
                </AnimatePresence>

                {/* Center logo */}
                <motion.div
                    animate={{
                        boxShadow: [
                            "0 0 30px rgba(79,70,229,0.2)",
                            "0 0 60px rgba(79,70,229,0.5)",
                            "0 0 30px rgba(79,70,229,0.2)"
                        ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-16 h-16 rounded-full bg-surface-50 border-2 border-brand-500 flex items-center justify-center z-30"
                >
                    <span className="text-brand-600 font-bold text-2xl font-headline">M</span>
                </motion.div>
            </div>

            {/* Status text */}
            <motion.h3
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-lg font-bold text-gradient mb-1 font-headline"
            >
                {jobs.length > 0 ? `Found ${jobs.length} matches` : 'Scanning Job Market...'}
            </motion.h3>
            <p className="text-xs text-gray-400 mb-4">
                {formatTime(elapsed)} elapsed
                {totalDetected > 0 && ` · ${totalDetected} companies detected`}
            </p>

            {/* Rotating tips */}
            <AnimatePresence mode="wait">
                <motion.p
                    key={tipIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="text-[11px] text-gray-400 text-center max-w-xs flex items-center gap-1.5"
                >
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    {TIPS[tipIndex]}
                </motion.p>
            </AnimatePresence>
        </div>
    );
}
