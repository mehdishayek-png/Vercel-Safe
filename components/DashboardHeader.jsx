'use client';
import { usePathname } from 'next/navigation';
import { HelpCircle, Coins, ChevronRight, Menu } from 'lucide-react';
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

export function DashboardHeader({ onMenuClick }) {
    const pathname = usePathname();
    const { tokenBalance } = useApp();
    const [showGuide, setShowGuide] = useState(false);

    const title = PAGE_TITLES[pathname] || 'Dashboard';
    const isSubpage = pathname !== '/dashboard';

    return (
        <>
            <header className="h-12 px-4 md:px-6 flex items-center justify-between bg-white border-b border-gray-100 shrink-0 sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <button onClick={onMenuClick} className="p-1.5 -ml-1 mr-1 text-gray-500 hover:text-gray-700 md:hidden cursor-pointer">
                        <Menu className="w-5 h-5" />
                    </button>
                    {isSubpage && (
                        <>
                            <Link href="/dashboard" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors font-medium">
                                Home
                            </Link>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                        </>
                    )}
                    <h1 className="text-[13px] font-semibold text-gray-900">{title}</h1>
                </div>

                <div className="flex items-center gap-3">
                    {typeof tokenBalance === 'number' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-100 text-[11px] font-medium text-gray-500">
                            <Coins className="w-3 h-3 text-gray-400" />
                            {tokenBalance}
                        </div>
                    )}

                    <button
                        onClick={() => setShowGuide(true)}
                        className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer rounded-md hover:bg-gray-50"
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
