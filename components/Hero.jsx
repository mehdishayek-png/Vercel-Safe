import { motion } from 'framer-motion';
import { ArrowRight, Play, Zap, Star } from 'lucide-react';
import { Button } from './ui/Button';

export function Hero({ onStart, onDemo }) {
    return (
        <section className="relative min-h-[90vh] flex items-center overflow-hidden px-8 pt-20">
            {/* Background blobs */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary-light/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-brand-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 w-full">
                {/* Left: Copy */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-midas-surface-high mb-8">
                        <span className="w-2 h-2 rounded-full bg-secondary-DEFAULT ai-pulse mr-3" />
                        <span className="text-xs font-bold tracking-wider uppercase text-slate-500">2026 Editorial AI Experience</span>
                    </div>

                    <h1 className="font-headline text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter leading-[1.05] text-gray-900 mb-8">
                        The Midas Touch{' '}
                        <br className="hidden sm:block" />
                        <span className="text-gradient">in Job Searching.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-500 leading-relaxed mb-10 max-w-lg">
                        Midas Match AI doesn't just find jobs; it orchestrates your career flow. Transform your professional trajectory with our predictive intelligence engine.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button size="xl" onClick={onStart} className="bg-brand-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl shadow-brand-600/20 hover:scale-[1.02]">
                            Start Your Evolution
                        </Button>
                        <button
                            onClick={onDemo}
                            className="flex items-center justify-center gap-2 text-gray-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-midas-surface-low transition-colors cursor-pointer"
                        >
                            <Play className="w-5 h-5" />
                            Watch the Flow
                        </button>
                    </div>
                </motion.div>

                {/* Right: AI Scanning Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="relative"
                >
                    <div className="glass-panel border border-slate-200/30 rounded-2xl p-8 shadow-hero relative overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-brand-600" />
                                </div>
                                <div>
                                    <h4 className="font-headline font-bold text-gray-900">Midas Engine</h4>
                                    <p className="text-xs text-slate-400">Scanning global opportunities...</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-headline font-extrabold text-secondary-DEFAULT">98%</span>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confidence</p>
                            </div>
                        </div>

                        {/* Scan line effect */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                            <div className="w-full h-[2px] bg-secondary-DEFAULT shadow-[0_0_15px_rgba(113,42,226,0.8)] absolute top-0 animate-scan" />
                        </div>

                        {/* Job cards */}
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:-translate-y-1 transition-transform"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-secondary-DEFAULT mb-1">STRATEGIC MATCH</p>
                                        <h5 className="font-headline font-bold text-lg text-gray-900">Product Visionary</h5>
                                        <p className="text-sm text-slate-400">Nexus Dynamics &bull; Remote</p>
                                    </div>
                                    <span className="bg-secondary-light text-white px-3 py-1 rounded-full text-[10px] font-bold">TOP MATCH</span>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 }}
                                className="p-5 bg-white rounded-xl border border-slate-100 opacity-60"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-brand-600 mb-1">GROWTH MATCH</p>
                                        <h5 className="font-headline font-bold text-lg text-gray-900">Lead Architect</h5>
                                        <p className="text-sm text-slate-400">Stellar Systems &bull; Zurich</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
