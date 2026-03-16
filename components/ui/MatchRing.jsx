import { motion } from 'framer-motion';
import { getMatchColor, getMatchBadge } from '@/lib/match-colors';

export function MatchRing({ score, size = 64, strokeWidth = 5 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    const { hex } = getMatchColor(score);
    const { dot: dotClass } = getMatchBadge(score);

    // Glow color based on score tier
    const glowColor = score >= 80 ? 'rgba(16,185,129,0.15)' : score >= 60 ? 'rgba(59,130,246,0.15)' : 'rgba(156,163,175,0.08)';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Subtle ambient glow behind the ring */}
            <div
                className="absolute inset-0 rounded-full blur-md"
                style={{ background: glowColor }}
            />
            <svg width={size} height={size} className="transform -rotate-90 relative z-10">
                {/* Background Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Ring */}
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={hex}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 3px ${hex}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col z-10">
                <span className="text-[15px] font-extrabold leading-none" style={{ color: hex }}>{score}</span>
                <span className="text-[8px] font-semibold text-gray-400 mt-0.5">/100</span>
            </div>
        </div>
    );
}
