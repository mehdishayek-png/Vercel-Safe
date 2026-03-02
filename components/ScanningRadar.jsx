import { motion } from 'framer-motion';
import { Target, Sparkles, Database, FileText } from 'lucide-react';

export function ScanningRadar() {
    return (
        <div className="flex flex-col items-center justify-center py-20 overflow-hidden relative">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-64 h-64 flex items-center justify-center mb-12">

                {/* Outer Dashed Ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-[1px] border-dashed border-blue-300/40 rounded-full"
                />

                {/* Middle Solid Ring */}
                <div className="absolute inset-8 border-[1px] border-indigo-200/50 rounded-full" />

                {/* Inner Glow Ring */}
                <div className="absolute inset-16 border-2 border-purple-100 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.2)]" />

                {/* The Radar Sweep (Conic Gradient) */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 rounded-full overflow-hidden"
                >
                    <div className="absolute inset-0"
                        style={{
                            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(59, 130, 246, 0.1) 320deg, rgba(59, 130, 246, 0.4) 360deg)'
                        }}
                    />
                    {/* The sweeping line */}
                    <div className="absolute top-0 right-1/2 w-[2px] h-1/2 bg-gradient-to-t from-transparent via-blue-400 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] origin-bottom" />
                </motion.div>

                {/* Floating Data Nodes (Orbits) */}
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={`orbit-${i}`}
                        className="absolute inset-0"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 6 + (i * 3), repeat: Infinity, ease: "linear", delay: i * 1.5 }}
                    >
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] ${i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-indigo-400' : 'bg-purple-400'}`} />
                    </motion.div>
                ))}

                {/* Center Core */}
                <motion.div
                    animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 20px rgba(59,130,246,0.3)", "0 0 40px rgba(59,130,246,0.6)", "0 0 20px rgba(59,130,246,0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 bg-white p-5 rounded-full border border-blue-100"
                >
                    <BrainCircuitIcon />
                </motion.div>

            </div>

            <div className="space-y-3 text-center relative z-10 max-w-sm">
                <motion.h3
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                >
                    Deep AI Scan in Progress...
                </motion.h3>
                <div className="text-gray-500 text-sm flex items-center justify-center gap-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}><Sparkles className="w-3.5 h-3.5 text-blue-400" /></motion.div>
                    <span>Extracting semantic matches across global databases.</span>
                </div>
            </div>

            {/* Visual Flair Icons scattered in background */}
            <motion.div animate={{ y: [0, -10, 0], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-10 left-10 text-blue-300"><Database className="w-6 h-6" /></motion.div>
            <motion.div animate={{ y: [0, 10, 0], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 5, repeat: Infinity }} className="absolute bottom-10 right-10 text-purple-300"><FileText className="w-6 h-6" /></motion.div>
        </div>
    );
}

function BrainCircuitIcon() {
    // Custom icon mimicking lucide's BrainCircuit to avoid import issues if not available
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
            <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.58 2.58 2.5 2.5 0 0 0 5.34 0 2.5 2.5 0 0 0 2.58-2.58 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5Z" />
            <path d="M12 4.5v15" />
            <path d="m15 11.5 5-2" />
            <path d="m14 16.5 5 2" />
            <path d="m9 11.5-5-2" />
            <path d="m10 16.5-5 2" />
        </svg>
    )
}
