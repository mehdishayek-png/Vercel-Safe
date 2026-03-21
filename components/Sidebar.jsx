'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, Bookmark, Briefcase, Settings, ChevronLeft, X, GraduationCap, Sparkles, Mic, Network, Target, SlidersHorizontal, LayoutGrid } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useApp } from '@/contexts/AppContext';

const NAV_ITEMS = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/dashboard/search', icon: Search, label: 'Opportunities' },
    { href: '/dashboard/pipeline', icon: LayoutGrid, label: 'Pipeline' },
    { href: '/dashboard/skill-bridge', icon: Target, label: 'Skill Analysis' },
    { href: '/dashboard/network', icon: Network, label: 'Network' },
    { href: '/dashboard/ai-refinement', icon: SlidersHorizontal, label: 'AI Refinement' },
    { href: '/dashboard/voice-concierge', icon: Mic, label: 'Voice Concierge' },
    { href: '/dashboard/saved', icon: Bookmark, label: 'Saved Jobs' },
    { href: '/dashboard/applications', icon: Briefcase, label: 'Applications' },
    { href: '/dashboard/prep', icon: GraduationCap, label: 'Interview Prep' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { user } = useUser();
    const { savedJobIds, appliedJobIds } = useApp();

    const isActive = (href) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    };

    const getBadge = (href) => {
        if (href === '/dashboard/saved') return savedJobIds.size || null;
        if (href === '/dashboard/applications') return appliedJobIds.size || null;
        return null;
    };

    return (
        <>
            {/* Backdrop — mobile only */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-50 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-[#1a1d27] border-r border-slate-100 dark:border-[#2d3140] flex flex-col min-h-screen transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:w-[240px] md:z-auto md:sticky md:top-0 md:shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="px-5 h-14 flex items-center gap-3 border-b border-slate-100 dark:border-[#2d3140]">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-secondary-DEFAULT flex items-center justify-center shadow-md shadow-brand-600/20">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight font-headline block">Midas Match</span>
                        <span className="text-[9px] font-bold tracking-[0.15em] text-gray-400 dark:text-gray-500 uppercase">AI Orchestration</span>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 md:hidden cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User info */}
                <div className="px-4 py-4 border-b border-slate-100 dark:border-[#2d3140]">
                    <SignedIn>
                        <div className="flex items-center gap-3">
                            <UserButton
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        avatarBox: "w-9 h-9",
                                    }
                                }}
                            />
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate font-headline">
                                    {user?.firstName || 'User'}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                    {user?.primaryEmailAddress?.emailAddress || 'Job Seeker'}
                                </p>
                            </div>
                        </div>
                    </SignedIn>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="w-full px-4 py-2.5 text-[13px] font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer shadow-md shadow-brand-600/20">
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">Menu</p>
                    {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                        const active = isActive(href);
                        const badge = getBadge(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={onClose}
                                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
                                    active
                                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                                        : 'text-slate-500 hover:text-gray-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-gray-100 dark:hover:bg-[#22252f]'
                                }`}
                            >
                                <Icon className={`w-[18px] h-[18px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-brand-500 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
                                <span className="flex-1 font-headline">{label}</span>
                                {badge && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        active ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                                    }`}>
                                        {badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="px-3 py-3 border-t border-slate-100 dark:border-[#2d3140]">
                    <Link
                        href="/"
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:text-gray-700 hover:bg-slate-50 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-[#22252f] transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>

                {/* Support banner */}
                <div className="mx-3 mb-3 px-4 py-3 rounded-xl bg-gradient-to-br from-brand-50 to-secondary-DEFAULT/5 dark:from-brand-900/20 dark:to-secondary-DEFAULT/10 border border-brand-100 dark:border-brand-800/30">
                    <p className="text-[11px] text-brand-700 dark:text-brand-400 leading-snug font-medium">
                        Need help?{' '}
                        <a href="mailto:midasmatchsupport@gmail.com" className="font-bold underline underline-offset-2 hover:text-brand-900 dark:hover:text-brand-300 transition-colors">
                            Contact support
                        </a>
                    </p>
                </div>

                {/* Footer links */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-[#2d3140] flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <a href="/privacy" className="hover:text-brand-500 transition-colors">Privacy</a>
                    <a href="/terms" className="hover:text-brand-500 transition-colors">Terms</a>
                    <a href="/refund" className="hover:text-brand-500 transition-colors">Refund</a>
                </div>
            </aside>
        </>
    );
}
