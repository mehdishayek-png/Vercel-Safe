'use client';
import { usePathname } from 'next/navigation';
import { HelpCircle, Coins, ChevronRight, Menu, Bell, Settings, ArrowRight, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { GuideModal } from './GuideModal';
import { useTokenStore } from '@/stores/token-store';
import { useSearchStore } from '@/stores/search-store';
import { useJobsStore } from '@/stores/jobs-store';
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/dashboard/search': 'Search Jobs',
    '/dashboard/saved': 'Saved Jobs',
    '/dashboard/applications': 'Applications',
    '/dashboard/prep': 'Interview Prep',
    '/dashboard/settings': 'Settings',
};

export function DashboardHeader({ onMenuClick }) {
    const pathname = usePathname();
    const tokenBalance = useTokenStore(s => s.tokenBalance);
    const { showReturnNotification, setShowReturnNotification } = useSearchStore();
    const { savedJobsData, appliedJobsData } = useJobsStore();
    const [showGuide, setShowGuide] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    const savedCount = savedJobsData?.length ?? 0;
    const appliedCount = appliedJobsData?.length ?? 0;
    const hasActivity = savedCount > 0 || appliedCount > 0;

    useEffect(() => {
        function handleClickOutside(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        }
        if (showNotifications) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications]);

    return (
        <>
            <header className="sticky top-0 w-full z-40 bg-white/60 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] h-16 px-8 flex justify-between items-center">
                <div className="flex items-center gap-8 flex-1">
                    <button onClick={onMenuClick} className="p-2 -ml-1 mr-1 text-gray-500 hover:text-gray-700 md:hidden cursor-pointer">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="relative w-full max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-surface-100 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-500/20 transition-all"
                            placeholder="Search roles, companies, or skills..."
                            type="text"
                        />
                    </div>
                    <nav className="hidden lg:flex items-center gap-6 font-headline font-medium text-sm">
                        {Object.entries(PAGE_TITLES).slice(0, 4).map(([href, label]) => (
                            <Link
                                key={href}
                                href={href}
                                className={`transition-colors ${
                                    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
                                        ? 'text-brand-600 border-b-2 border-brand-600 pb-1'
                                        : 'text-slate-500 hover:text-brand-500'
                                }`}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {typeof tokenBalance === 'number' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 text-[11px] font-semibold text-slate-500">
                            <Coins className="w-3 h-3 text-brand-500" />
                            {tokenBalance}
                        </div>
                    )}
                    <SignedIn><div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(v => !v)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer"
                        >
                            <Bell className="w-5 h-5" />
                            {(showReturnNotification || hasActivity) && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full"></span>
                            )}
                        </button>
                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
                                >
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                        <span className="text-sm font-semibold text-slate-700">Notifications</span>
                                        <button
                                            onClick={() => setShowNotifications(false)}
                                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <X className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </div>
                                    {hasActivity ? (
                                        <div className="px-4 py-4 space-y-3">
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Activity</p>
                                            {savedCount > 0 && (
                                                <Link
                                                    href="/dashboard/saved"
                                                    onClick={() => setShowNotifications(false)}
                                                    className="flex items-center justify-between p-3 bg-surface-50 hover:bg-surface-100 rounded-xl transition-colors group"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700">{savedCount} saved job{savedCount !== 1 ? 's' : ''}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Review your saved listings</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
                                                </Link>
                                            )}
                                            {appliedCount > 0 && (
                                                <Link
                                                    href="/dashboard/applications"
                                                    onClick={() => setShowNotifications(false)}
                                                    className="flex items-center justify-between p-3 bg-surface-50 hover:bg-surface-100 rounded-xl transition-colors group"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700">{appliedCount} application{appliedCount !== 1 ? 's' : ''}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Track your progress</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
                                                </Link>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-8 text-center">
                                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                            <p className="text-sm text-slate-400">No notifications yet</p>
                                            <p className="text-xs text-slate-300 mt-0.5">Activity will appear here</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div></SignedIn>

                    <button onClick={() => setShowGuide(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                        <HelpCircle className="w-5 h-5" />
                    </button>
                    <SignedIn>
                        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                    </SignedIn>
                </div>
            </header>

            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>
        </>
    );
}
