import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from './ui/Button';

export function Hero({ onStart, onDemo }) {
    return (
        <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
            {/* Animated gradient mesh blobs */}
            <div className="absolute inset-0 -z-10">
                {/* Original radial wash */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-brand-100/50 via-accent-100/20 to-transparent rounded-full blur-[100px]" />

                {/* Purple/violet blob — top-left */}
                <motion.div
                    animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-[120px]"
                />

                {/* Teal blob — center-right */}
                <motion.div
                    animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0] }}
                    transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-1/4 right-0 w-[450px] h-[400px] bg-teal-200/30 rounded-full blur-[100px]"
                />

                {/* Amber/warm blob — bottom */}
                <motion.div
                    animate={{ x: [0, 15, -10, 0], y: [0, -10, 20, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-0 left-1/3 w-[400px] h-[350px] bg-amber-100/20 rounded-full blur-[80px]"
                />
            </div>

            <div className="container mx-auto px-4 text-center z-10 max-w-4xl">
                {/* Colorful gradient badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-50 via-violet-50 to-accent-50 border border-brand-200/60 mb-8 shadow-sm"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-brand-500 to-violet-500"></span>
                    </span>
                    <span className="text-xs font-semibold bg-gradient-to-r from-brand-700 via-violet-600 to-accent-600 bg-clip-text text-transparent tracking-wide">AI-Powered Job Search Agent</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 leading-[1.1]"
                >
                    Stop Searching.{' '}
                    <br className="hidden md:block" />
                    <span className="text-gradient">Start Matching.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Upload your resume and let our AI agent scan thousands of jobs,
                    score each one against your profile, and surface only
                    the roles worth your time.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-3"
                >
                    <Button size="xl" onClick={onStart} icon={ArrowRight}>
                        Find Your Next Role
                    </Button>
                    <Button variant="secondary" size="xl" onClick={onDemo} icon={Play}>
                        See How It Works
                    </Button>
                </motion.div>

                {/* Trust strip */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-2"
                >
                    {['In-memory processing only', 'Resume never stored', 'Not used for AI training'].map((text) => (
                        <span key={text} className="text-[11px] text-gray-400 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            {text}
                        </span>
                    ))}
                </motion.div>

                {/* Scanning sources pills */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="mt-8 flex flex-col items-center gap-3"
                >
                    <span className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Scanning jobs from</span>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['LinkedIn', 'Indeed', 'Google Jobs', 'Greenhouse', 'Lever'].map((source) => (
                            <span
                                key={source}
                                className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-[11px] font-medium border border-gray-200/60"
                            >
                                {source}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
