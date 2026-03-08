import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Star } from 'lucide-react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { GuideModal } from './GuideModal';

export function Header({ onShowGuide, onClearData, tokenBalance }) {
    const [scrolled, setScrolled] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleGuideClick = () => {
        if (onShowGuide) {
            onShowGuide();
        } else {
            setShowGuide(true);
        }
    };

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 transition-shadow ${scrolled ? 'shadow-sm' : ''}`}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-base font-bold">
                        M
                    </div>
                    <span className="text-lg font-bold text-gray-900 tracking-tight">Midas</span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Token count badge */}
                    {typeof tokenBalance === 'number' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-[13px] font-semibold text-violet-600 cursor-pointer hover:bg-violet-100 transition-colors">
                            <Star className="w-3.5 h-3.5 fill-violet-500 text-violet-500" />
                            {tokenBalance} tokens
                        </div>
                    )}

                    {onClearData && (
                        <button
                            onClick={onClearData}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full transition-all"
                        >
                            Clear Data
                        </button>
                    )}

                    <button
                        onClick={handleGuideClick}
                        aria-label="How it Works"
                        className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 bg-transparent border-none cursor-pointer transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">How it Works</span>
                    </button>

                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="px-5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-full shadow-sm transition-all">
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
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
