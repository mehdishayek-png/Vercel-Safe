import { motion } from 'framer-motion';
import { Upload, Search, CheckCircle } from 'lucide-react';

const steps = [
    {
        icon: Upload,
        num: "01",
        title: "Upload Resume",
        desc: "Drop your PDF. We extract skills, experience, and preferences in seconds."
    },
    {
        icon: Search,
        num: "02",
        title: "AI Scores Jobs",
        desc: "Our engine scans multiple job boards and ranks matches through 10 scoring multipliers."
    },
    {
        icon: CheckCircle,
        num: "03",
        title: "Apply With Confidence",
        desc: "Review top-ranked matches with deep fit analysis, then apply to the ones that matter."
    }
];

export function HowItWorks() {
    return (
        <section className="py-24 relative overflow-hidden">
            {/* Subtle background gradient pattern */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-surface-50 via-white to-surface-50" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-100/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-100/15 rounded-full blur-[100px]" />
                {/* Dot pattern overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }}
                />
            </div>

            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">How it works</h2>
                    <p className="text-gray-900 text-lg">Three steps to your next opportunity.</p>
                </div>

                <div className="relative">
                    {/* Vertical connecting timeline line */}
                    <div className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-gradient-to-b from-brand-200 via-brand-300 to-brand-200 hidden md:block" />

                    <div className="space-y-6">
                        {steps.map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ delay: i * 0.15 }}
                                className="flex items-start gap-5 bg-white/80 dark:bg-[#1a1d27]/80 backdrop-blur-sm border border-surface-200 dark:border-[#2d3140] rounded-xl p-6 relative"
                            >
                                {/* Timeline dot */}
                                <div className="absolute -left-[5px] top-8 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white shadow-sm hidden md:block" />

                                <div className="flex flex-col items-center shrink-0 gap-2">
                                    {/* Large gradient number */}
                                    <span className="text-2xl font-black bg-gradient-to-br from-brand-500 via-violet-500 to-accent-500 bg-clip-text text-transparent leading-none">
                                        {s.num}
                                    </span>
                                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-center justify-center">
                                        <s.icon className="w-5 h-5 text-brand-600" />
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{s.title}</h3>
                                    <p className="text-gray-900 text-sm leading-relaxed">{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
