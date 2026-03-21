'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';

export function ReturnNotification() {
    const { showReturnNotification, setShowReturnNotification, savedJobsData, appliedJobsData } = useApp();

    if (!showReturnNotification) return null;

    const savedCount = savedJobsData.length;
    const appliedCount = appliedJobsData.length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-6 mt-4 bg-gradient-to-r from-brand-600 to-accent-600 text-white rounded-[10px] px-5 py-4 flex items-center gap-4 shadow-lg"
            >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Welcome back! Time to check your job updates.</p>
                    <p className="text-xs text-white/70 mt-0.5">
                        {savedCount > 0 && `You have ${savedCount} saved job${savedCount !== 1 ? 's' : ''}`}
                        {savedCount > 0 && appliedCount > 0 && ' and '}
                        {appliedCount > 0 && `${appliedCount} application${appliedCount !== 1 ? 's' : ''} to track`}
                        {savedCount === 0 && appliedCount === 0 && 'Run a new search to discover fresh opportunities.'}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {savedCount > 0 && (
                        <Link
                            href="/dashboard/saved"
                            onClick={() => setShowReturnNotification(false)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
                        >
                            View Saved <ArrowRight className="w-3 h-3" />
                        </Link>
                    )}
                    <button
                        onClick={() => setShowReturnNotification(false)}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
