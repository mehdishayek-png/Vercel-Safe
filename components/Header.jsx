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
                className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-14 transition-all ${scrolled ? 'bg-white/90 dark:bg-ink-950/90 backdrop-blur-md border-b border-ink-200 dark:border-ink-800' : 'bg-transparent border-b border-transparent'}`}
            >
                <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-ink-900 dark:text-ink-50 tracking-tight">Midas</span>
                    <span className="gold-bar !w-2 !h-2 rounded-full" />
                </div>

                <div className="flex items-center gap-2">
                    {typeof tokenBalance === 'number' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-xs font-medium text-brand-700 dark:text-brand-400">
                            <Coins className="w-3.5 h-3.5" />
                            {tokenBalance}
                        </div>
                    )}

                    {onClearData && (
                        <button
                            onClick={onClearData}
                            className="hidden sm:block px-2.5 py-1 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}

                    <Link
                        href="/dashboard"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100 transition-colors"
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Dashboard
                    </Link>

                    <button
                        onClick={handleGuideClick}
                        aria-label="How it Works"
                        className="flex items-center gap-1.5 p-2 text-xs text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 bg-transparent border-none cursor-pointer transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Guide</span>
                    </button>

                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="px-4 py-1.5 text-xs font-semibold text-ink-950 dark:text-ink-50 bg-brand-400 hover:bg-brand-500 rounded-md transition-colors cursor-pointer shadow-button">
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
