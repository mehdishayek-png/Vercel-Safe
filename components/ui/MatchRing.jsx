import { motion } from 'framer-motion';
import { getMatchColor } from '@/lib/match-colors';

export function MatchRing({ score, size = 56, strokeWidth = 3.5 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    const color = getMatchColor(score).hex;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    className="text-ink-200 dark:text-ink-800"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Ring */}
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[13px] font-bold font-display" style={{ color }}>{Math.round(score)}</span>
            </div>
        </div>
    );
}
