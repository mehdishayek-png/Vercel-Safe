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
            <nav
                className={`fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl transition-all duration-300 ${scrolled ? 'shadow-sm' : ''}`}
            >
                <div className="flex justify-between items-center max-w-7xl mx-auto px-8 h-20">
                    <Link href="/" className="text-2xl font-bold tracking-tighter text-brand-700">
                        Midas Match
                    </Link>

                    <div className="hidden md:flex items-center space-x-10">
                        <a href="#features" className="text-slate-600 hover:text-brand-500 transition-colors font-medium">Solutions</a>
                        <a href="#how-it-works" className="text-slate-600 hover:text-brand-500 transition-colors font-medium">Platform</a>
                        <a href="#preview" className="text-slate-600 hover:text-brand-500 transition-colors font-medium">Intelligence</a>
                        <Link href="/about" className="text-slate-600 hover:text-brand-500 transition-colors font-medium">About</Link>
                    </div>

                    <div className="flex items-center space-x-6">
                        {typeof tokenBalance === 'number' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-100 text-xs font-semibold text-brand-600">
                                <Coins className="w-3.5 h-3.5" />
                                {tokenBalance}
                            </div>
                        )}

                        {onClearData && (
                            <button
                                onClick={onClearData}
                                className="hidden sm:block px-2.5 py-1 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                                Clear
                            </button>
                        )}

                        <Link
                            href="/dashboard"
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>

                        <button
                            onClick={handleGuideClick}
                            aria-label="How it Works"
                            className="hidden sm:flex items-center gap-1.5 p-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer transition-colors"
                        >
                            <HelpCircle className="w-4 h-4" />
                        </button>

                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="text-slate-600 hover:text-brand-500 transition-colors font-medium cursor-pointer">
                                    Sign In
                                </button>
                            </SignInButton>
                        </SignedOut>

                        <Link
                            href="/dashboard/search"
                            className="bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-all duration-300 active:scale-95"
                        >
                            Get Started
                        </Link>

                        <SignedIn>
                            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                        </SignedIn>
                    </div>
                </div>
            </nav>

            <AnimatePresence>
                {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            </AnimatePresence>
        </>
    );
}
