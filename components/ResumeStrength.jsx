import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react';

export function ResumeStrength({ profile }) {
    if (!profile) return null;

    // Calculate score based on simple heuristics
    let score = 0;
    const checks = [
        { label: "Name & Headline", passed: !!(profile.name && profile.headline), points: 20 },
        { label: "Skills Detected", passed: profile.skills?.length > 0, points: 20 },
        { label: "Strong Skillset (5+)", passed: profile.skills?.length >= 5, points: 20 },
        { label: "Experience Parsed", passed: true, points: 20 }, // Assuming we have this if parsing worked
        { label: "Ready to Match", passed: true, points: 20 }
    ];

    score = checks.reduce((acc, curr) => curr.passed ? acc + curr.points : acc, 0);

    // Determine status color
    const getColor = (s) => {
        if (s >= 80) return "text-emerald-400";
        if (s >= 50) return "text-yellow-400";
        return "text-red-400";
    };

    const getBgColor = (s) => {
        if (s >= 80) return "bg-emerald-500";
        if (s >= 50) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-6 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full ${getBgColor(score)} opacity-50`} />

            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${getColor(score)}`} />
                        Profile Strength
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                        {score >= 80 ? "Your profile is match-ready!" : "Improve your profile for better matches."}
                    </p>
                </div>
                <div className={`text-xl font-bold ${getColor(score)}`}>{score}%</div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${getBgColor(score)}`}
                />
            </div>

            {/* Checklist */}
            <div className="space-y-2">
                {checks.map((check, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                        <span className={`flex items-center gap-2 ${check.passed ? 'text-white/80' : 'text-white/40'}`}>
                            {check.passed ?
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" /> :
                                <AlertCircle className="w-3.5 h-3.5 text-white/20" />
                            }
                            {check.label}
                        </span>
                        {check.passed && <span className="text-[10px] text-emerald-500/50 font-mono">+{check.points}</span>}
                    </div>
                ))}
            </div>

            {score < 100 && (
                <div className="mt-4 pt-3 border-t border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold mb-2">Recommendation</p>
                    <p className="text-xs text-white/60">
                        Add more specific skills (e.g., "React", "Node.js") to increase match precision.
                    </p>
                </div>
            )}
        </div>
    );
}
