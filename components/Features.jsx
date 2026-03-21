import { motion } from 'framer-motion';
import { Sparkles, BarChart3, Headphones, Lock, Cpu, Target } from 'lucide-react';

const features = [
    {
        icon: Sparkles,
        title: 'AI Resume Alchemy',
        description: 'Dynamic optimization that reformats your experience for each specific high-tier opportunity.',
        color: 'text-secondary-DEFAULT',
        span: 'md:col-span-3',
    },
    {
        icon: BarChart3,
        title: 'Real-time Salary Intel',
        description: 'Proprietary data on compensation benchmarks for elite roles in the tech ecosystem.',
        color: 'text-brand-600',
        span: 'md:col-span-3',
    },
    {
        icon: Headphones,
        title: '24/7 Career Concierge',
        description: 'Automated scheduling and follow-ups handled by your AI agent.',
        color: 'text-slate-600',
        span: 'md:col-span-2',
    },
    {
        icon: Lock,
        title: 'Stealth Mode',
        description: 'Advanced privacy shields that hide your profile from your current employer\'s network.',
        color: 'text-red-500',
        span: 'md:col-span-2',
    },
    {
        icon: Cpu,
        title: 'Interview Sim',
        description: 'AI coaching sessions tailored to the specific company\'s interview style.',
        color: 'text-secondary-DEFAULT',
        span: 'md:col-span-2',
    },
];

export function Features() {
    return (
        <section id="features" className="py-32 bg-midas-surface-low">
            <div className="max-w-7xl mx-auto px-8">
                <div className="mb-20">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-xs font-bold tracking-[0.2em] text-brand-600 uppercase block mb-4"
                    >
                        Platform Capabilities
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900"
                    >
                        Engineered for Excellence
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
                    {features.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className={`${f.span} bg-white p-10 rounded-2xl group hover:shadow-xl transition-shadow`}
                            >
                                <Icon className={`w-10 h-10 ${f.color} mb-6`} />
                                <h3 className="font-headline text-xl md:text-2xl font-bold mb-3 text-gray-900">{f.title}</h3>
                                <p className="text-slate-500 leading-relaxed text-sm md:text-base">{f.description}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
