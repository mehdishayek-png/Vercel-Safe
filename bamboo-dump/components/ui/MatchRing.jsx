import { motion } from 'framer-motion';

export function MatchRing({ score, size = 60, strokeWidth = 4 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s) => {
        if (s >= 80) return "#10b981"; // emerald-500
        if (s >= 60) return "#3b82f6"; // blue-500
        return "#9ca3af"; // gray-400
    };

    const color = getColor(score);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e5e7eb"
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
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    className="drop-shadow-sm"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-sm font-bold text-gray-900" style={{ color }}>{score}</span>
            </div>
        </div>
    );
}
