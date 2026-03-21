import { motion } from 'framer-motion';
import { Target, CheckCircle2, CircleDashed, Sparkles, Loader2 } from 'lucide-react';
import { useRazorpay } from '../lib/useRazorpay';

export function ResumeStrength({ profile, onTokensUpdated }) {
    const { initiatePayment, isProcessing } = useRazorpay({
        onSuccess: () => onTokensUpdated?.(),
    });

    if (!profile) return null;

    const checks = [
        { label: "Identity & Targets", passed: !!(profile.name && profile.headline), points: 20 },
        { label: "Skills Parsed", passed: profile.skills?.length > 0, points: 20 },
        { label: "5+ Skills", passed: profile.skills?.length >= 5, points: 20 },
        { label: "Experience Set", passed: true, points: 20 },
        { label: "Ready to Scan", passed: true, points: 20 }
    ];

    const score = checks.reduce((acc, curr) => curr.passed ? acc + curr.points : acc, 0);
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = (s) => s >= 80 ? "text-brand-600" : s >= 50 ? "text-accent-500" : "text-red-400";
    const getStrokeColor = (s) => s >= 80 ? "stroke-brand-600" : s >= 50 ? "stroke-accent-500" : "stroke-red-400";

    return (
        <div className="bg-white dark:bg-[#1C1B19] border border-ink-200 dark:border-[#2E2B27] rounded-[10px] p-5 shadow-card">
            <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="transform -rotate-90 w-12 h-12">
                            <circle cx="24" cy="24" r={radius} className="stroke-surface-100 fill-none" strokeWidth="3.5" />
                            <motion.circle cx="24" cy="24" r={radius} className={`${getStrokeColor(score)} fill-none`} strokeWidth="3.5"
                                strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset }}
                                transition={{ duration: 1.2, ease: "easeOut" }} strokeLinecap="round" />
                        </svg>
                        <span className={`absolute text-[13px] font-bold ${getColor(score)}`}>{score}</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-1.5">
                            <Target className={`w-3.5 h-3.5 ${getColor(score)}`} />
                            Profile Readiness
                        </h3>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                            {score >= 80 ? "Ready for AI matching." : "Improve profile for better results."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {checks.map((check, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        className="flex items-center justify-between text-[13px] p-2 rounded-lg bg-surface-50 dark:bg-[#252420] border border-ink-100 dark:border-[#2E2B27]"
                    >
                        <span className={`flex items-center gap-2 font-medium ${check.passed ? 'text-ink-700 dark:text-ink-200' : 'text-ink-400'}`}>
                            {check.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 shrink-0" /> : <CircleDashed className="w-3.5 h-3.5 text-ink-300 shrink-0" />}
                            {check.label}
                        </span>
                        {check.passed && <span className="text-[10px] font-semibold text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded-md">+{check.points}</span>}
                    </motion.div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-ink-100 dark:border-[#2E2B27]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-accent-500" /> Tokens
                    </span>
                    {isProcessing ? (
                        <span className="text-[9px] font-semibold bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Loading
                        </span>
                    ) : (
                        <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider">₹399 / 50</span>
                    )}
                </div>
                <div onClick={initiatePayment} className="cursor-pointer bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 hover:border-brand-200 rounded-lg p-3 transition-colors">
                    <div className="flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-ink-900 dark:text-ink-100 mb-0.5">50x Deep Scan Pack</p>
                            <p className="text-[11px] text-ink-500 leading-relaxed">Unlock AI analysis, salary estimates, and skill gaps for your top jobs.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
