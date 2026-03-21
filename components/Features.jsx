import { motion } from 'framer-motion';
import { Brain, FileText, Zap, Target, Globe, ShieldCheck } from 'lucide-react';

const features = [
    {
        icon: Brain,
        title: "10-Layer Scoring",
        desc: "Every job scored through seniority, location, role family, semantic similarity, and more. Not keyword spam — real signal detection.",
    },
    {
        icon: FileText,
        title: "Instant Resume Parsing",
        desc: "Drop your PDF — skills, experience level, and preferences extracted in seconds. No forms to fill out.",
    },
    {
        icon: Globe,
        title: "Multi-Source Aggregation",
        desc: "Jobs from LinkedIn, Indeed, Google Jobs, and 350+ career pages — all scored against your profile in one scan.",
    },
    {
        icon: Target,
        title: "AI Deep Scan",
        desc: "Detailed fit analysis with skill gaps, salary estimates, and an honest AI verdict for every job.",
    },
    {
        icon: Zap,
        title: "Hybrid AI + Heuristic",
        desc: "Local scoring for speed, LLM verification for nuance. Combined for results you can trust.",
    },
    {
        icon: ShieldCheck,
        title: "Noise Elimination",
        desc: "Scams, wrong-country postings, and seniority mismatches filtered before you see them.",
    }
];

export function Features() {
    return (
        <section className="py-24 bg-surface-50 dark:bg-ink-950">
            <div className="container mx-auto px-6 lg:px-10 max-w-6xl">
                <div className="mb-16 max-w-xl">
                    <span className="gold-bar mb-4" />
                    <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-ink-900 dark:text-ink-50 tracking-tight">Built for precision, not noise</h2>
                    <p className="text-ink-500 dark:text-ink-400 text-base">
                        Everything you need to land your next role, powered by AI that actually understands your profile.
                    </p>
                </div>

                {/* Two-column layout with alternating emphasis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.06, duration: 0.4 }}
                            className="group flex gap-4"
                        >
                            <div className="shrink-0 mt-1">
                                <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200/60 dark:border-brand-800/40 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 transition-colors">
                                    <f.icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-display text-base font-semibold mb-1.5 text-ink-900 dark:text-ink-100">{f.title}</h3>
                                <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
