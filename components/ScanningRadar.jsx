import { motion } from 'framer-motion';
import { Sparkles, Database, FileText } from 'lucide-react';

export function ScanningRadar() {
    return (
        <div className="flex flex-col items-center justify-center py-16 overflow-hidden relative">
            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                {/* Outer ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-dashed border-brand-200 rounded-full"
                />

                {/* Middle ring */}
                <div className="absolute inset-8 border border-brand-100 rounded-full" />

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
                    className="relative z-10 bg-white p-4 rounded-full border border-brand-100 shadow-card"
                >
                    <BrainIcon />
                </motion.div>
            </div>

            <div className="text-center max-w-xs">
                <motion.h3
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-lg font-bold text-gradient mb-1"
                >
                    Scanning Job Market...
                </motion.h3>
                <div className="text-gray-400 text-xs flex items-center justify-center gap-1.5">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                        <Sparkles className="w-3 h-3 text-brand-400" />
                    </motion.div>
                    Matching against your profile
                </div>
            </div>
        </div>
    );
}

function BrainIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
            <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.58 2.58 2.5 2.5 0 0 0 5.34 0 2.5 2.5 0 0 0 2.58-2.58 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5Z" />
            <path d="M12 4.5v15" />
            <path d="m15 11.5 5-2" />
            <path d="m14 16.5 5 2" />
            <path d="m9 11.5-5-2" />
            <path d="m10 16.5-5 2" />
        </svg>
    );
}
