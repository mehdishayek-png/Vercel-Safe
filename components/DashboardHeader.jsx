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
};

export function DashboardHeader({ onMenuClick }) {
    const pathname = usePathname();
    const { tokenBalance } = useApp();
    const [showGuide, setShowGuide] = useState(false);

    const title = PAGE_TITLES[pathname] || 'Dashboard';
    const isSubpage = pathname !== '/dashboard';

    return (
        <>
            <header className="h-12 px-4 md:px-6 flex items-center justify-between bg-white dark:bg-[#1C1B19] border-b border-ink-200 dark:border-ink-800 shrink-0 sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <button onClick={onMenuClick} className="p-2 -ml-1 mr-1 text-ink-500 hover:text-ink-700 md:hidden cursor-pointer">
                        <Menu className="w-5 h-5" />
                    </button>
                    {isSubpage && (
                        <>
                            <Link href="/dashboard" className="text-[12px] text-ink-400 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-300 transition-colors font-medium">
                                Home
                            </Link>
                            <ChevronRight className="w-3 h-3 text-ink-300 dark:text-ink-600" />
                        </>
                    )}
                    <h1 className="text-[13px] font-semibold text-ink-900 dark:text-ink-100">{title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    {typeof tokenBalance === 'number' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/40 text-[11px] font-medium text-brand-700 dark:text-brand-400">
                            <Coins className="w-3 h-3" />
                            {tokenBalance}
                        </div>
                    )}

                    <ThemeToggle />

                    <button
                        onClick={() => setShowGuide(true)}
                        className="p-2 text-ink-300 hover:text-ink-500 dark:text-ink-600 dark:hover:text-ink-400 transition-colors cursor-pointer rounded-md hover:bg-surface-100 dark:hover:bg-ink-800"
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
