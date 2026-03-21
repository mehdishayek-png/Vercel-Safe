import { motion } from 'framer-motion';
import { Brain, Network, ShieldCheck } from 'lucide-react';

const steps = [
    {
        icon: Brain,
        title: '01. Cognitive Sync',
        description: 'Our AI analyzes your latent skills, personality traits, and career goals to build a unique professional profile.',
        color: 'bg-brand-600 text-white',
    },
    {
        icon: Network,
        title: '02. Market Pulsing',
        description: 'Continuous scanning of thousands of high-tier roles, filtering for those that match your unique trajectory DNA.',
        color: 'bg-secondary-DEFAULT text-white',
    },
    {
        icon: ShieldCheck,
        title: '03. Smart Intro',
        description: 'Facilitated introductions that bypass traditional recruiters, placing your profile directly on the decision-maker\'s desk.',
        color: 'bg-slate-600 text-white',
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-32 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-8">
                <div className="mb-20 text-center lg:text-left">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-gray-900"
                    >
                        Precision Workflow
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-500 text-lg max-w-2xl"
                    >
                        Three phases of cognitive alignment between your ambition and the market.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 relative">
                    {/* Connector line (desktop) */}
                    <div className="hidden md:block absolute top-12 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent z-0" />

                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="relative z-10 p-8 pt-0 group"
                            >
                                <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center mb-10 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-7 h-7" />
                                </div>
                                <h3 className="font-headline text-2xl font-bold mb-4 text-gray-900">{step.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{step.description}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
