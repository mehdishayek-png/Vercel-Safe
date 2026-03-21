import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HelpCircle, Coins, LayoutDashboard } from 'lucide-react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { GuideModal } from './GuideModal';
import Link from 'next/link';

export function Header({ onShowGuide, onClearData, tokenBalance }) {
    const [scrolled, setScrolled] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleGuideClick = () => {
        if (onShowGuide) onShowGuide();
        else setShowGuide(true);
    };

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14 bg-white/95 dark:bg-[#1a1d27]/95 backdrop-blur-sm border-b transition-all ${scrolled ? 'border-surface-200 dark:border-[#2d3140] shadow-sm' : 'border-transparent'}`}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
                        M
                    </div>
                    <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Midas</span>
                </div>

                <div className="flex items-center gap-3">
                    {typeof tokenBalance === 'number' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 text-xs font-semibold text-brand-600 dark:text-brand-400">
                            <Coins className="w-3.5 h-3.5" />
                            {tokenBalance}
                        </div>
                    )}

                    {onClearData && (
                        <button
                            onClick={onClearData}
                            className="hidden sm:block px-2.5 py-1 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}

                    <Link
                        href="/dashboard"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Dashboard
                    </Link>

                    <button
                        onClick={handleGuideClick}
                        aria-label="How it Works"
                        className="flex items-center gap-1.5 p-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-transparent border-none cursor-pointer transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Guide</span>
                    </button>

                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="px-4 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors cursor-pointer">
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
                    </SignedIn>
                </div>
            </header>

            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>
        </>
    );
}
