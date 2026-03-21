import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from './ui/Button';

export function Hero({ onStart, onDemo }) {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 pb-10 overflow-hidden">
            {/* Animated gradient mesh blobs */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] md:w-[900px] h-[300px] md:h-[600px] bg-gradient-to-b from-brand-100/50 via-accent-100/20 to-transparent rounded-full blur-[80px] md:blur-[100px]" />
                <motion.div
                    animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-20 -left-20 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-violet-200/40 rounded-full blur-[80px] md:blur-[120px]"
                />
                <motion.div
                    animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0] }}
                    transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-1/4 right-0 w-[200px] md:w-[450px] h-[200px] md:h-[400px] bg-teal-200/30 rounded-full blur-[60px] md:blur-[100px]"
                />
                <motion.div
                    animate={{ x: [0, 15, -10, 0], y: [0, -10, 20, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-0 left-1/3 w-[200px] md:w-[400px] h-[180px] md:h-[350px] bg-amber-100/20 rounded-full blur-[50px] md:blur-[80px]"
                />
            </div>

            <div className="container mx-auto px-4 text-center z-10 max-w-6xl">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-brand-50 via-violet-50 to-accent-50 border border-brand-200/60 mb-10 shadow-sm"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-brand-500 to-violet-500"></span>
                    </span>
                    <span className="text-sm font-semibold bg-gradient-to-r from-brand-700 via-violet-600 to-accent-600 bg-clip-text text-transparent tracking-wide">AI-Powered Job Search Agent</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wider">Beta</span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-gray-900 leading-[1.05]"
                >
                    1,000 Jobs Scanned.{' '}
                    <br className="hidden sm:block" />
                    <span className="text-gradient">Only the Best Delivered.</span>
                </motion.h1>

                {/* Subheading */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl lg:text-2xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed"
                >
                    Upload your resume. Our AI scans 8+ sources, scores every job
                    against your profile, and delivers only the matches worth your time.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-3"
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
                    Free during beta · 5 scans daily
                </motion.p>

                {/* Trust strip */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3"
                >
                    {['In-memory processing only', 'Resume never stored', 'Not used for AI training'].map((text) => (
                        <span key={text} className="text-sm text-gray-400 flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            {text}
                        </span>
                    ))}
                </motion.div>

                {/* Source pills */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="mt-8 flex flex-col items-center gap-3"
                >
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">Scanning jobs from</span>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['LinkedIn', 'Indeed', 'Google Jobs', 'Career Pages', '350+ Sources'].map((source) => (
                            <span
                                key={source}
                                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                    source === '350+ ATS'
                                        ? 'bg-brand-50 text-brand-600 border-brand-200/60'
                                        : 'bg-gray-100 text-gray-500 border-gray-200/60'
                                }`}
                            >
                                {source}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* Dashboard mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="mt-16 max-w-5xl mx-auto"
                >
                    <div className="relative rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-[#1a1d27] shadow-2xl shadow-gray-200/50 dark:shadow-black/30 overflow-hidden">
                        {/* Browser chrome */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#22252f] border-b border-gray-100 dark:border-[#2d3140]">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-300" />
                                <div className="w-3 h-3 rounded-full bg-amber-300" />
                                <div className="w-3 h-3 rounded-full bg-emerald-300" />
                            </div>
                            <div className="flex-1 mx-4">
                                <div className="h-6 bg-gray-100 dark:bg-[#2d3140] rounded-md max-w-xs mx-auto flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500">
                                    midasmatch.com/dashboard
                                </div>
                            </div>
                        </div>
                        {/* Fake dashboard */}
                        <div className="p-4 md:p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-900 dark:bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">M</div>
                                    <div className="h-4 w-24 bg-gray-100 dark:bg-[#2d3140] rounded" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-8 w-20 bg-brand-50 dark:bg-brand-900/30 rounded-lg" />
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2d3140]" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { company: 'Stripe', role: 'Customer Success Manager', score: 92 },
                                    { company: 'Notion', role: 'CX Operations Lead', score: 87 },
                                    { company: 'Datadog', role: 'Technical Account Manager', score: 81 },
                                    { company: 'HubSpot', role: 'Client Solutions Specialist', score: 76 },
                                ].map((job, i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-[#2d3140] bg-white dark:bg-[#1a1d27]">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#2d3140] flex items-center justify-center text-[11px] font-bold text-gray-400">
                                                {job.company[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{job.role}</div>
                                                <div className="text-[11px] text-gray-400">{job.company}</div>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-bold ${job.score >= 85 ? 'text-emerald-600' : 'text-teal-600'}`}>
                                            {job.score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-[#1a1d27] to-transparent pointer-events-none" />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
