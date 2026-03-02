import { motion } from 'framer-motion';
import { Target, CheckCircle2, CircleDashed, Zap, Lock, Sparkles, Loader2 } from 'lucide-react';
import { useRazorpay } from '../lib/useRazorpay';

export function ResumeStrength({ profile, onTokensUpdated }) {
    const { initiatePayment, isProcessing } = useRazorpay({
        onSuccess: (data) => {
            onTokensUpdated?.();
        },
    });

    if (!profile) return null;

    let score = 0;
    const checks = [
        { label: "Identity & Core Targets", passed: !!(profile.name && profile.headline), points: 20 },
        { label: "Semantic Skills Parsed", passed: profile.skills?.length > 0, points: 20 },
        { label: "High-Signal Expertise", passed: profile.skills?.length >= 5, points: 20 },
        { label: "Experience Delta Locked", passed: true, points: 20 },
        { label: "Ready for Deep Scan", passed: true, points: 20 }
    ];

    score = checks.reduce((acc, curr) => curr.passed ? acc + curr.points : acc, 0);
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = (s) => {
        if (s >= 80) return "text-blue-500";
        if (s >= 50) return "text-purple-400";
        return "text-red-400";
    };

    const getStrokeColor = (s) => {
        if (s >= 80) return "stroke-blue-500";
        if (s >= 50) return "stroke-purple-400";
        return "stroke-red-400";
    };

    return (
        <div className="bg-white/90 backdrop-blur-xl border border-gray-100 rounded-3xl p-6 relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(59,130,246,0.1)] transition-all duration-300">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex gap-4 items-center">
                    {/* Radial Progress */}
                    <div className="relative w-14 h-14 flex items-center justify-center">
                        <svg className="transform -rotate-90 w-14 h-14">
                            <circle cx="28" cy="28" r={radius} className="stroke-gray-100 fill-none" strokeWidth="4" />
                            <motion.circle
                                cx="28" cy="28" r={radius}
                                className={`${getStrokeColor(score)} fill-none z-10 drop-shadow-md`}
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className={`text-[15px] font-bold ${getColor(score)} leading-none`}>
                                {score}
                            </span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Target className={`w-4 h-4 ${getColor(score)}`} />
                            Profile Readiness
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                            {score >= 80 ? "Optimized for AI Agents." : "AI detection needs improvement."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3 relative z-10">
                {checks.map((check, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between text-[13px] bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50"
                    >
                        <span className={`flex items-center gap-2.5 font-medium ${check.passed ? 'text-gray-700' : 'text-gray-400'}`}>
                            {check.passed ?
                                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> :
                                <CircleDashed className="w-4 h-4 text-gray-300 shrink-0" />
                            }
                            {check.label}
                        </span>
                        {check.passed && (
                            <span className="text-[10px] font-bold text-blue-500/70 bg-blue-50 px-2 py-0.5 rounded-full">
                                +{check.points}
                            </span>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* PRO Upsell Tier */}
            <div className="mt-6 pt-5 border-t border-gray-100 relative z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-50/30 to-transparent pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        Scout Tokens
                    </h4>
                    {isProcessing ? (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Loading
                        </span>
                    ) : (
                        <span className="text-[9px] font-bold bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded uppercase tracking-wider">₹399 / 50 PACK</span>
                    )}
                </div>

                <div
                    onClick={initiatePayment}
                    className="group/pro cursor-pointer relative overflow-hidden bg-white border border-blue-100 hover:border-blue-300 rounded-xl p-3 transition-all duration-300"
                >
                    <div className="flex items-start gap-3 opacity-80 group-hover/pro:opacity-100 transition-opacity">
                        <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-gray-900 mb-0.5">50x Deep Scan Pack</p>
                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                Get 50 tokens to completely unlock AI-powered match gaps, hidden red flags, and salary negotiation leverage for your top jobs.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
