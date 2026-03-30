import { motion } from 'framer-motion';
import { Brain, FileText, Zap, Target, Globe, ShieldCheck } from 'lucide-react';

const features = [
    {
        icon: Brain,
        title: "AI Match Scoring",
        desc: "Every job scored through seniority, location, role family, semantic similarity, and 6 more signals. You see the breakdown.",
        color: "text-brand-600 bg-brand-50",
        hoverBg: "group-hover:bg-brand-50/30",
    },
    {
        icon: FileText,
        title: "Resume Parsing",
        desc: "Upload once, search forever. Your resume becomes your search engine — skills, experience, and preferences extracted in seconds.",
        color: "text-accent-600 bg-accent-50",
        hoverBg: "group-hover:bg-accent-50/30",
    },
    {
        icon: Globe,
        title: "Multi-Source Search",
        desc: "Jobs from LinkedIn, Indeed, Google Jobs, and 350+ company career pages — all scored against your profile in one scan.",
        color: "text-sky-600 bg-sky-50",
        hoverBg: "group-hover:bg-sky-50/30",
    },
    {
        icon: Target,
        title: "Deep Analysis",
        desc: "Detailed fit reports with skill gaps, salary estimates, and an honest AI verdict. Know exactly where you stand.",
        color: "text-emerald-600 bg-emerald-50",
        hoverBg: "group-hover:bg-emerald-50/30",
    },
    {
        icon: Zap,
        title: "Interview Prep",
        desc: "AI-generated practice questions tailored to each role — behavioral, technical, and situational. Walk in prepared.",
        color: "text-amber-600 bg-amber-50",
        hoverBg: "group-hover:bg-amber-50/30",
    },
    {
        icon: ShieldCheck,
        title: "Save & Track",
        desc: "Bookmark jobs, track applications, export to CSV. One place for your entire search — no more spreadsheet chaos.",
        color: "text-rose-600 bg-rose-50",
        hoverBg: "group-hover:bg-rose-50/30",
    }
];

export function Features() {
    return (
        <section className="py-28 relative bg-surface-50 dark:bg-[#12141c]">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="mb-16">
                    <span className="text-xs font-bold tracking-[0.15em] text-brand-600 uppercase block mb-4">What you get</span>
                    <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">Built for precision, not noise</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl">
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
                            className={`group relative bg-white dark:bg-[#1a1d27] border border-surface-200 dark:border-[#2d3140] rounded-2xl p-7 hover:shadow-card-hover transition-all duration-300 ${f.hoverBg}`}
                        >
                            <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-5`}>
                                <f.icon className="w-5 h-5" />
                            </div>
                            <h3 className="font-headline text-lg font-bold mb-2 text-gray-900 dark:text-white">{f.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
