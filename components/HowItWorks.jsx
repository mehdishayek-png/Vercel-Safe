import { motion } from 'framer-motion';
import { Upload, Search, CheckCircle } from 'lucide-react';

const steps = [
    {
        icon: Upload,
        num: "01",
        title: "Upload Your Resume",
        desc: "Drop your PDF and our AI extracts your skills, experience, and what makes you unique — in seconds."
    },
    {
        icon: Search,
        num: "02",
        title: "We Scan the Market",
        desc: "Midas searches LinkedIn, Indeed, Google Jobs, and 350+ company career pages to find roles that match your profile."
    },
    {
        icon: CheckCircle,
        num: "03",
        title: "Get Matched & Apply",
        desc: "Each job gets a match score based on your skills, experience level, and preferences. Save, compare, and apply — all in one place."
    }
];

export function HowItWorks() {
    return (
        <section className="py-28 relative overflow-hidden">
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-surface-50 dark:bg-[#0f1117]" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-100/15 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-100/10 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 max-w-5xl">
                <div className="mb-16">
                    <span className="text-xs font-bold tracking-[0.15em] text-brand-600 uppercase block mb-4">How it works</span>
                    <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">Three steps to your next role</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl">No complexity. Upload, scan, apply.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {/* Connector line */}
                    <div className="hidden md:block absolute top-14 left-0 w-full h-px bg-gradient-to-r from-transparent via-surface-200 to-transparent z-0" />

                    {steps.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15 }}
                            className="relative z-10"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-flow-gradient text-white flex items-center justify-center mb-8 shadow-lg shadow-brand-600/20 group-hover:scale-110 transition-transform">
                                <s.icon className="w-6 h-6" />
                            </div>
                            <span className="text-5xl font-headline font-extrabold text-surface-200 dark:text-gray-800 mb-4 block">{s.num}</span>
                            <h3 className="font-headline text-xl font-bold text-gray-900 dark:text-white mb-3">{s.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
