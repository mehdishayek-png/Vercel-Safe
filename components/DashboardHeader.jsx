'use client';
import { usePathname } from 'next/navigation';
import { HelpCircle, Coins, ChevronRight, Menu } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { GuideModal } from './GuideModal';
import { ThemeToggle } from './ThemeToggle';
import { useApp } from '@/contexts/AppContext';

const PAGE_TITLES = {
    '/dashboard': 'Home',
    '/dashboard/search': 'Search Jobs',
    '/dashboard/saved': 'Saved Jobs',
    '/dashboard/applications': 'Applications',
    '/dashboard/prep': 'Interview Prep',
    '/dashboard/settings': 'Settings',
};

export function DashboardHeader({ onMenuClick }) {
    const pathname = usePathname();
    const { tokenBalance } = useApp();
    const [showGuide, setShowGuide] = useState(false);

    const title = PAGE_TITLES[pathname] || 'Dashboard';
    const isSubpage = pathname !== '/dashboard';

    return (
        <>
            <header className="h-14 px-4 md:px-6 flex items-center justify-between bg-white/80 dark:bg-[#1a1d27]/80 backdrop-blur-xl border-b border-surface-200/60 dark:border-[#2d3140] shrink-0 sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <button onClick={onMenuClick} className="p-2 -ml-1 mr-1 text-gray-500 hover:text-gray-700 md:hidden cursor-pointer">
                        <Menu className="w-5 h-5" />
                    </button>
                    {isSubpage && (
                        <>
                            <Link href="/dashboard" className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors font-medium">
                                Home
                            </Link>
                            <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                        </>
                    )}
                    <h1 className="font-headline text-[14px] font-bold text-gray-900 dark:text-gray-100">{title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    {typeof tokenBalance === 'number' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-[#22252f] border border-surface-200 dark:border-[#2d3140] text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            <Coins className="w-3 h-3 text-brand-500 dark:text-brand-400" />
                            {tokenBalance}
                        </div>
                    )}

                    <ThemeToggle />

                    <button
                        onClick={() => setShowGuide(true)}
                        className="p-2 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors cursor-pointer rounded-xl hover:bg-surface-100 dark:hover:bg-[#22252f]"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>
        </>
    );
}
