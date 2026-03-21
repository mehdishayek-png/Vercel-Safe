import { motion } from 'framer-motion';
import { Upload, Search, CheckCircle } from 'lucide-react';

const steps = [
    {
        icon: Upload,
        title: "Upload your resume",
        desc: "Drop your PDF. We extract skills, experience, and preferences in seconds."
    },
    {
        icon: Search,
        title: "AI scores every job",
        desc: "Our engine scans multiple job boards and ranks matches through 10 scoring multipliers."
    },
    {
        icon: CheckCircle,
        title: "Apply with confidence",
        desc: "Review top-ranked matches with deep fit analysis, then apply to the ones that matter."
    }
];

export function HowItWorks() {
    return (
        <section className="py-24 bg-white dark:bg-[#1C1B19]">
            <div className="container mx-auto px-6 lg:px-10 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-12 lg:gap-20">
                    {/* Left — section title */}
                    <div>
                        <span className="gold-bar mb-4" />
                        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink-900 dark:text-ink-50">How it works</h2>
                        <p className="text-ink-500 dark:text-ink-400 mt-3 text-sm leading-relaxed">Three steps to your next opportunity. No forms, no busywork.</p>
                    </div>

                    {/* Right — steps */}
                    <div className="space-y-8">
                        {steps.map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 15 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ delay: i * 0.12, duration: 0.4 }}
                                className="flex gap-5 items-start"
                            >
                                <div className="shrink-0 flex flex-col items-center gap-2">
                                    <span className="font-display text-3xl font-bold text-brand-400 dark:text-brand-400 leading-none">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="pt-1">
                                    <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-100 mb-1">{s.title}</h3>
                                    <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed">{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
