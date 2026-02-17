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
                    className="absolute inset-0 border-2 border-blue-400/30 rounded-full"
                    style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 border-2 border-purple-400/30 rounded-full"
                    style={{ borderBottomColor: 'transparent', borderLeftColor: 'transparent' }}
                />

                {/* Pulse */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-blue-400/10 rounded-full"
                />

                {/* Center Icon */}
                <div className="relative z-10 bg-white p-4 rounded-full border border-blue-100 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    <Target className="w-8 h-8 text-blue-500" />
                </div>
            </div>

            <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold text-gray-900">
                    Scanning Global Networks...
                </h3>
                <p className="text-gray-500 text-sm">Targeting relevant opportunities based on your profile DNA.</p>
            </div>
        </div>
    );
}
