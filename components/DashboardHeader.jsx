'use client';
import { usePathname } from 'next/navigation';
import { HelpCircle, Coins, Bell, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { GuideModal } from './GuideModal';
import { useApp } from '@/contexts/AppContext';

const PAGE_TITLES = {
    '/dashboard': 'Home',
    '/dashboard/search': 'Search Jobs',
    '/dashboard/saved': 'Saved Jobs',
    '/dashboard/applications': 'Applications',
};

export function DashboardHeader() {
    const pathname = usePathname();
    const { tokenBalance } = useApp();
    const [showGuide, setShowGuide] = useState(false);

    const title = PAGE_TITLES[pathname] || 'Dashboard';
    const isSubpage = pathname !== '/dashboard';

    return (
        <>
            <header className="h-14 px-6 flex items-center justify-between bg-white shrink-0 sticky top-0 z-40 relative">
                <div className="flex items-center gap-2">
                    {isSubpage && (
                        <>
                            <Link href="/dashboard" className="text-xs text-gray-400 hover:text-brand-600 transition-colors font-medium">
                                Home
                            </Link>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                        </>
                    )}
                    <h1 className="text-[15px] font-bold text-gray-900">{title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    {typeof tokenBalance === 'number' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-100 text-xs font-semibold text-brand-600">
                            <Coins className="w-3.5 h-3.5" />
                            {tokenBalance}
                        </div>
                    )}

                    <button
                        onClick={() => setShowGuide(true)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Guide</span>
                    </button>
                </div>

                {/* Gradient bottom border */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-400 via-accent-400 to-emerald-400 opacity-40" />
            </header>

            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>
        </>
    );
}
