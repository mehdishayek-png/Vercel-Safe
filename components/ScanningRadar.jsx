import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

export function ScanningRadar() {
    return (
        <div className="flex flex-col items-center justify-center py-24">
            <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                {/* Rotating Rings */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-indigo-500/30 rounded-full"
                    style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 border-2 border-purple-500/30 rounded-full"
                    style={{ borderBottomColor: 'transparent', borderLeftColor: 'transparent' }}
                />

                {/* Pulse */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-indigo-500/10 rounded-full"
                />

                {/* Center Icon */}
                <div className="relative z-10 bg-[#0A0A0A] p-4 rounded-full border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                    <Target className="w-8 h-8 text-indigo-400" />
                </div>
            </div>

            <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                    Scanning Global Networks...
                </h3>
                <p className="text-white/40 text-sm">Targeting relevant opportunities based on your profile DNA.</p>
            </div>
        </div>
    );
}
