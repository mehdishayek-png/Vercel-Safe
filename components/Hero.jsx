import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Play } from 'lucide-react';
import { Button } from './ui/Button';

export function Hero({ onStart, onDemo }) {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent rounded-[100%] blur-[120px] -z-10" />

            <div className="container mx-auto px-4 text-center z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-8 backdrop-blur-md shadow-lg"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    <span className="text-xs font-medium text-white/80 tracking-wide">AI-Powered Job Agent 2.0</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-6xl md:text-8xl font-bold tracking-tight mb-6"
                >
                    Stop Applying <br />
                    <span className="text-gradient-accent">Manually.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
                >
                    Let our autonomous agent find relevant jobs, tailor your resume, and apply to 100+ positions while you sleep.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-4"
                >
                    <Button size="xl" onClick={onStart} icon={ArrowRight}>
                        Start Applying Automatically
                    </Button>
                    <Button variant="secondary" size="xl" onClick={onDemo} icon={Play}>
                        Watch Demo
                    </Button>
                </motion.div>

                {/* Trust badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                    className="mt-20 pt-10 border-t border-white/5"
                >
                    <p className="text-sm text-white/30 uppercase tracking-widest mb-6">Trusted by candidates who got into</p>
                    <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        {['Google', 'Netflix', 'Spotify', 'Stripe', 'Airbnb'].map((company) => (
                            <span key={company} className="text-xl font-bold font-mono">{company}</span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
