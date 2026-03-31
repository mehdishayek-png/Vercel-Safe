'use client';
import { usePathname } from 'next/navigation';
import { HelpCircle, Coins, ChevronRight, Menu, Bell, Settings } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { GuideModal } from './GuideModal';
import { ThemeToggle } from './ThemeToggle';
import { useApp } from '@/contexts/AppContext';
import { UserButton, SignedIn } from '@clerk/nextjs';

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
    const { tokenBalance } = useApp();
    const [showGuide, setShowGuide] = useState(false);

    return (
        <>
            <header className="sticky top-0 w-full z-40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] h-16 px-8 flex justify-between items-center">
                <div className="flex items-center gap-8 flex-1">
                    <button onClick={onMenuClick} className="p-2 -ml-1 mr-1 text-gray-500 hover:text-gray-700 md:hidden cursor-pointer">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="relative w-full max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-surface-100 dark:bg-slate-800/50 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-500/20 transition-all"
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
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500">
                            <Coins className="w-3 h-3 text-brand-500" />
                            {tokenBalance}
                        </div>
                    )}
                    <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#22252f] rounded-full transition-colors relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full"></span>
                    </button>
                    <ThemeToggle />
                    <button onClick={() => setShowGuide(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#22252f] rounded-full transition-colors cursor-pointer">
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
