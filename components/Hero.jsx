import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from './ui/Button';

export function Hero({ onStart, onDemo }) {
    return (
        <section className="relative min-h-[90vh] flex items-center pt-14 overflow-hidden bg-ink-950">
            {/* Warm subtle glow — not a blob, just ambient light */}
            <div className="absolute top-0 right-0 w-[60%] h-[80%] bg-gradient-to-bl from-brand-500/8 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-gradient-to-tr from-brand-600/5 via-transparent to-transparent pointer-events-none" />

            <div className="container mx-auto px-6 lg:px-10 relative z-10 max-w-6xl">
                <div className="max-w-3xl">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="inline-flex items-center gap-2 mb-8"
                    >
                        <span className="gold-bar" />
                        <span className="text-sm font-medium text-brand-400 tracking-wide">AI-Powered Job Matching</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-300 uppercase tracking-wider">Beta</span>
                    </motion.div>

                    {/* Headline — left-aligned, big, no gradient text */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08 }}
                        className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-white leading-[1.08]"
                    >
                        1,000 jobs scanned.
                        <br />
                        <span className="text-brand-400">Only the best delivered.</span>
                    </motion.h1>

                    {/* Sub — concise */}
                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="text-lg md:text-xl text-ink-400 max-w-xl mb-10 leading-relaxed"
                    >
                        Upload your resume. Our AI scans 8+ sources, scores every job
                        against your profile, and surfaces only what&apos;s worth your time.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.22 }}
                        className="flex flex-col sm:flex-row items-start gap-3"
                    >
                        <Button size="xl" onClick={onStart} icon={ArrowRight}>
                            Get Started Free
                        </Button>
                        <Button variant="ghost-dark" size="xl" onClick={onDemo} icon={Play}>
                            See How It Works
                        </Button>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="text-sm text-ink-600 mt-4"
                    >
                        Free during beta &middot; 5 scans daily &middot; No credit card
                    </motion.p>

                    {/* Trust strip */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="mt-12 flex flex-wrap gap-x-6 gap-y-2"
                    >
                        {['In-memory processing only', 'Resume never stored', 'Not used for AI training'].map((text) => (
                            <span key={text} className="text-sm text-ink-500 flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                {text}
                            </span>
                        ))}
                    </motion.div>
                </div>

                {/* Stats — simple inline, not a card grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="mt-16 pt-8 border-t border-ink-800 flex flex-wrap gap-x-12 gap-y-4"
                >
                    {[
                        { value: '1,000+', label: 'Jobs per scan' },
                        { value: '350+', label: 'Career pages' },
                        { value: '8+', label: 'Sources' },
                        { value: '<60s', label: 'Scan time' },
                    ].map(({ value, label }) => (
                        <div key={label}>
                            <div className="font-display text-2xl md:text-3xl font-bold text-white">{value}</div>
                            <div className="text-sm text-ink-500 mt-0.5">{label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
