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
        <section className="py-24 bg-surface-50 relative overflow-hidden">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">How it works</h2>
                    <p className="text-gray-500 text-lg">Three steps to your next opportunity.</p>
                </div>

                <div className="space-y-6">
                    {steps.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15 }}
                            className="flex items-start gap-5 bg-white border border-surface-200 rounded-xl p-6"
                        >
                            <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                                <s.icon className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-brand-400 tracking-wider">{s.num}</span>
                                    <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                                </div>
                                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
