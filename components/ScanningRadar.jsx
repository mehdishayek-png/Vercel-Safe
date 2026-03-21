import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';

const SCAN_STAGES = [
    { label: 'Analyzing your profile', duration: 3000 },
    { label: 'Planning search queries', duration: 4000 },
    { label: 'Scanning job databases', duration: 15000 },
    { label: 'Querying company career pages', duration: 20000 },
    { label: 'Deduplicating results', duration: 3000 },
    { label: 'Scoring matches against your skills', duration: 10000 },
    { label: 'Running AI deep analysis on top matches', duration: 15000 },
];

const TIPS = [
    "Tip: Save jobs you like — it helps us learn your preferences",
    "Tip: Try the Interview Prep page after finding a match",
    "Tip: Use the \"What I Do\" box to improve match accuracy",
    "Tip: Direct career page links skip aggregator sign-up walls",
    "Tip: Your resume is processed in memory and never stored",
];

export function ScanningRadar() {
    const [currentStage, setCurrentStage] = useState(0);
    const [tipIndex, setTipIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    // Progress through stages
    useEffect(() => {
        let total = 0;
        const timers = SCAN_STAGES.map((stage, i) => {
            total += stage.duration;
            return setTimeout(() => {
                if (i < SCAN_STAGES.length - 1) setCurrentStage(i + 1);
            }, total);
        });
        return () => timers.forEach(clearTimeout);
    }, []);

    // Rotate tips every 8 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % TIPS.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    // Elapsed timer
    useEffect(() => {
        const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="flex flex-col items-center justify-center py-12 overflow-hidden relative">
            {/* Radar */}
            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                {/* Outer ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-dashed border-brand-200 dark:border-brand-800 rounded-full"
                />

                {/* Middle ring */}
                <div className="absolute inset-8 border border-brand-100 dark:border-brand-900 rounded-full" />

                {/* Radar sweep */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 rounded-full overflow-hidden"
                >
                    <div className="absolute inset-0" style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(79,70,229,0.08) 320deg, rgba(79,70,229,0.25) 360deg)'
                    }} />
                    <div className="absolute top-0 right-1/2 w-[2px] h-1/2 bg-gradient-to-t from-transparent via-brand-400 to-brand-500 origin-bottom" />
                </motion.div>

                {/* Orbiting dots */}
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-0"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 6 + i * 3, repeat: Infinity, ease: "linear", delay: i * 1.2 }}
                    >
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${
                            i === 0 ? 'bg-brand-400' : i === 1 ? 'bg-accent-400' : 'bg-emerald-400'
                        }`} />
                    </motion.div>
                ))}

                {/* Center */}
                <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 bg-white dark:bg-[#1a1d27] p-3.5 rounded-full border border-brand-100 dark:border-brand-800 shadow-card"
                >
                    <BrainIcon />
                </motion.div>
            </div>

            {/* Title + timer */}
            <motion.h3
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-lg font-bold text-gradient mb-1"
            >
                Scanning Job Market...
            </motion.h3>
            <p className="text-xs text-gray-400 dark:text-gray-300 mb-6">
                {formatTime(elapsed)} elapsed • Usually takes about a minute
            </p>

            {/* Progress stages */}
            <div className="w-full max-w-xs space-y-1.5 mb-6">
                {SCAN_STAGES.map((stage, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                            i < currentStage
                                ? 'bg-emerald-500'
                                : i === currentStage
                                ? 'bg-brand-500 animate-pulse'
                                : 'bg-gray-200 dark:bg-gray-700'
                        }`}>
                            {i < currentStage ? (
                                <Check className="w-2.5 h-2.5 text-white" />
                            ) : i === currentStage ? (
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            ) : null}
                        </div>
                        <span className={`text-[12px] transition-colors duration-300 ${
                            i < currentStage
                                ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-60'
                                : i === currentStage
                                ? 'text-gray-900 dark:text-gray-100 font-medium'
                                : 'text-gray-300 dark:text-gray-300'
                        }`}>
                            {stage.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Rotating tips */}
            <AnimatePresence mode="wait">
                <motion.p
                    key={tipIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="text-[11px] text-gray-400 dark:text-gray-300 text-center max-w-xs flex items-center gap-1.5"
                >
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    {TIPS[tipIndex]}
                </motion.p>
            </AnimatePresence>
        </div>
    );
}

function BrainIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
            <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.58 2.58 2.5 2.5 0 0 0 5.34 0 2.5 2.5 0 0 0 2.58-2.58 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5Z" />
            <path d="M12 4.5v15" />
            <path d="m15 11.5 5-2" />
            <path d="m14 16.5 5 2" />
            <path d="m9 11.5-5-2" />
            <path d="m10 16.5-5 2" />
        </svg>
    );
}
