'use client';
import { usePathname } from 'next/navigation';
import { HelpCircle, Coins, Bell } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
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

    return (
        <>
            <header className="h-14 px-6 flex items-center justify-between bg-white border-b border-surface-200 shrink-0 sticky top-0 z-40">
                <div>
                    <h1 className="text-[15px] font-semibold text-gray-900">{title}</h1>
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
            </header>

            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>
        </>
    );
}
