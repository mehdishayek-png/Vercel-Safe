import { motion } from 'framer-motion';
import { Brain, FileText, Zap, Target, Globe, ShieldCheck } from 'lucide-react';

const features = [
    {
        icon: Brain,
        title: "10-Layer Scoring",
        desc: "Every job scored through seniority, location, role family, semantic similarity, and more.",
        color: "text-brand-600 bg-brand-50",
        hoverTint: "group-hover:bg-brand-50/50",
        gradientBorder: "from-brand-400 via-violet-400 to-brand-300",
    },
    {
        icon: FileText,
        title: "Instant Resume Parsing",
        desc: "Drop your PDF — skills, experience level, and preferences extracted in seconds.",
        color: "text-accent-600 bg-accent-50",
        hoverTint: "group-hover:bg-accent-50/50",
        gradientBorder: "from-accent-400 via-pink-400 to-accent-300",
    },
    {
        icon: Globe,
        title: "Multi-Source Aggregation",
        desc: "Jobs from LinkedIn, Indeed, Google Jobs, and more — all scored against your profile.",
        color: "text-sky-600 bg-sky-50",
        hoverTint: "group-hover:bg-sky-50/50",
        gradientBorder: "from-sky-400 via-cyan-400 to-sky-300",
    },
    {
        icon: Target,
        title: "AI Deep Scan",
        desc: "Detailed fit analysis with skill gaps, salary estimates, and an honest AI verdict.",
        color: "text-emerald-600 bg-emerald-50",
        hoverTint: "group-hover:bg-emerald-50/50",
        gradientBorder: "from-emerald-400 via-teal-400 to-emerald-300",
    },
    {
        icon: Zap,
        title: "Hybrid AI + Heuristic",
        desc: "Local scoring for speed, LLM verification for nuance. Combined for trustworthy results.",
        color: "text-amber-600 bg-amber-50",
        hoverTint: "group-hover:bg-amber-50/50",
        gradientBorder: "from-amber-400 via-orange-400 to-amber-300",
    },
    {
        icon: ShieldCheck,
        title: "Noise Elimination",
        desc: "Scams, wrong-country postings, and seniority mismatches removed before you see them.",
        color: "text-rose-600 bg-rose-50",
        hoverTint: "group-hover:bg-rose-50/50",
        gradientBorder: "from-rose-400 via-pink-400 to-rose-300",
    }
];

export function Features() {
    return (
        <section className="py-24 relative">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">Built for precision, not noise</h2>
                    <p className="text-gray-900 dark:text-white text-lg max-w-xl mx-auto">
                        Everything you need to land your next role, powered by AI that actually understands your profile.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            className="group relative"
                        >
                            {/* Animated gradient border on hover */}
                            <div className={`absolute -inset-[1px] rounded-xl bg-gradient-to-r ${f.gradientBorder} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[0.5px]`} />

                            <div className={`relative bg-white dark:bg-[#1a1d27] border border-surface-200 dark:border-[#2d3140] rounded-xl p-6 hover:shadow-card-hover transition-all duration-300 group-hover:border-transparent ${f.hoverTint}`}>
                                {/* Numbered badge top-right */}
                                <span className="absolute top-4 right-4 text-[11px] font-bold text-gray-900 dark:text-white tracking-wider">
                                    {String(i + 1).padStart(2, '0')}
                                </span>

                                <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center mb-4`}>
                                    <f.icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{f.title}</h3>
                                <p className="text-gray-900 dark:text-white text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
