import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Play } from 'lucide-react';
import { Button } from './ui/Button';

export function Hero({ onStart, onDemo }) {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-white/50">
            {/* Background gradients - Subtle & Airy */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-to-b from-blue-100/40 via-purple-100/20 to-transparent rounded-[100%] blur-[120px] -z-10" />

            <div className="container mx-auto px-4 text-center z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-black/5 mb-8 backdrop-blur-md shadow-sm"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-xs font-medium text-gray-600 tracking-wide">AI-Powered Job Agent 2.0</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-6xl md:text-8xl font-bold tracking-tight mb-6 text-gray-900"
                >
                    Stop Applying <br />
                    <span className="text-gradient-accent">Manually.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
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
                    className="mt-20 pt-10 border-t border-gray-200"
                >
                    <p className="text-sm text-gray-400 uppercase tracking-widest mb-6">Trusted by candidates who got into</p>
                    <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        {['Google', 'Netflix', 'Spotify', 'Stripe', 'Airbnb'].map((company) => (
                            <span key={company} className="text-xl font-bold font-mono text-gray-800">{company}</span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
