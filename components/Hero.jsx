import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from './ui/Button';

export function Hero({ onStart, onDemo }) {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 pb-10 overflow-hidden">
            {/* Atmospheric gradient blobs */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-accent-200/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-brand-200/20 rounded-full blur-[100px]" />
                <motion.div
                    animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-1/4 left-1/4 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-brand-200/15 rounded-full blur-[100px]"
                />
            </div>

            <div className="container mx-auto px-4 z-10 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left: Copy */}
                    <div>
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-100 border border-outline-variant/10 mb-8"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600"></span>
                            </span>
                            <span className="text-sm font-semibold text-gray-600 tracking-wide">AI-Powered Job Matching</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wider">Beta</span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="font-headline text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-8 text-gray-900 dark:text-white leading-[1.05]"
                        >
                            Stop Searching.{' '}
                            <br className="hidden sm:block" />
                            <span className="text-gradient">Start Matching.</span>
                        </motion.h1>

                        {/* Subheading */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-lg mb-10 leading-relaxed"
                        >
                            Upload your resume. Our AI scans 8+ sources, scores every job
                            against your profile, and delivers only the matches worth your time.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-start gap-3"
                        >
                            <Button size="xl" onClick={onStart} icon={ArrowRight}>
                                Get Started Free
                            </Button>
                            <Button variant="secondary" size="xl" onClick={onDemo} icon={Play}>
                                See How It Works
                            </Button>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="text-[13px] text-gray-400 mt-4"
                        >
                            5 free searches per day. No credit card needed.
                        </motion.p>

                        {/* Trust strip */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="mt-10 flex flex-wrap gap-x-6 gap-y-2"
                        >
                            {['Resume never stored', 'In-memory processing only', 'Not used for AI training'].map((text) => (
                                <span key={text} className="text-sm text-gray-400 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    {text}
                                </span>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right: Dashboard preview card */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="relative"
                    >
                        <div className="glass-panel rounded-2xl border border-outline-variant/10/60 p-6 md:p-8 shadow-elevated relative overflow-hidden">
                            {/* Scan line effect */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                                <div className="w-full h-[2px] bg-brand-500 shadow-[0_0_15px_rgba(113,42,226,0.6)] absolute top-0 animate-[scan_4s_ease-in-out_infinite]" />
                            </div>
                            <style jsx>{`
                                @keyframes scan {
                                    0% { top: 0; opacity: 0; }
                                    20% { opacity: 1; }
                                    80% { opacity: 1; }
                                    100% { top: 100%; opacity: 0; }
                                }
                            `}</style>

                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-flow-gradient flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-headline font-bold text-gray-900 dark:text-white">Midas Engine</h4>
                                        <p className="text-xs text-gray-400">Scanning job boards...</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-headline font-extrabold text-brand-600">98%</span>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Top Match</p>
                                </div>
                            </div>

                            {/* Job cards */}
                            <div className="space-y-3">
                                {[
                                    { title: 'Senior Frontend Engineer', company: 'Stripe', location: 'Remote', score: 98, badge: 'Top Match' },
                                    { title: 'Product Designer', company: 'Figma', location: 'San Francisco', score: 91 },
                                    { title: 'Full Stack Developer', company: 'Notion', location: 'New York', score: 87 },
                                ].map((job, i) => (
                                    <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-white dark:bg-gray-800 border-brand-100 dark:border-brand-800 shadow-sm' : 'bg-surface-50 dark:bg-gray-800/50 border-outline-variant/10/50'} transition-all hover:-translate-y-0.5`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                {job.badge && (
                                                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1 block">{job.badge}</span>
                                                )}
                                                <h5 className="font-headline font-bold text-gray-900 dark:text-white">{job.title}</h5>
                                                <p className="text-sm text-gray-500">{job.company} &middot; {job.location}</p>
                                            </div>
                                            <span className={`text-sm font-bold ${job.score >= 95 ? 'text-brand-600' : job.score >= 90 ? 'text-emerald-600' : 'text-teal-600'}`}>
                                                {job.score}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Source pills */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="mt-16 flex flex-col items-center gap-3"
                >
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">Scanning jobs from</span>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['LinkedIn', 'Indeed', 'Google Jobs', 'Career Pages', '350+ Sources'].map((source) => (
                            <span
                                key={source}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                                    source === '350+ Sources'
                                        ? 'bg-brand-50 text-brand-600 border-brand-200/60'
                                        : 'bg-surface-100 text-gray-500 border-outline-variant/10'
                                }`}
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
