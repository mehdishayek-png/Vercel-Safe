import { motion } from 'framer-motion';

export function DashboardPreview() {
    return (
        <section className="py-16 bg-midas-surface-low/50">
            <div className="max-w-7xl mx-auto px-8">
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-10"
                >
                    Empowering Talent At Industry Leaders
                </motion.p>
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 hover:opacity-60 transition-all duration-500"
                >
                    {['Google', 'Stripe', 'Airbnb', 'Linear', 'Figma'].map((name) => (
                        <div
                            key={name}
                            className="h-8 flex items-center text-xl font-bold text-slate-600 tracking-tight font-headline"
                        >
                            {name}
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
