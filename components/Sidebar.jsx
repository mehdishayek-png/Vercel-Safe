'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, Bookmark, Briefcase, User, Settings, LogOut, ChevronLeft, X, GraduationCap } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useApp } from '@/contexts/AppContext';

const NAV_ITEMS = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/dashboard/search', icon: Search, label: 'Search Jobs' },
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

            <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-[#1a1d27] border-r border-gray-100 dark:border-[#2d3140] text-gray-700 flex flex-col min-h-screen transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:w-[220px] md:z-auto md:sticky md:top-0 md:shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="px-5 h-12 flex items-center gap-2.5 border-b border-gray-100 dark:border-[#2d3140]">
                    <div className="w-7 h-7 rounded-lg bg-gray-900 dark:bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                        M
                    </div>
                    <span className="text-[14px] font-semibold text-gray-900 dark:text-white tracking-tight flex-1">Midas Match</span>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 md:hidden cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

            {/* User info */}
            <div className="px-4 py-3.5 border-b border-gray-100 dark:border-[#2d3140]">
                <SignedIn>
                    <div className="flex items-center gap-2.5">
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8",
                                }
                            }}
                        />
                        <div className="min-w-0">
                            <p className="text-[12px] font-medium text-gray-900 dark:text-gray-100 truncate">
                                {user?.firstName || 'User'}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                {user?.primaryEmailAddress?.emailAddress || 'Job Seeker'}
                            </p>
                        </div>
                    </div>
                </SignedIn>
                <SignedOut>
                    <SignInButton mode="modal">
                        <button className="w-full px-4 py-2 text-[12px] font-medium text-white bg-gray-900 dark:bg-indigo-600 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer">
                            Sign In
                        </button>
                    </SignInButton>
                </SignedOut>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3 space-y-0.5">
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const active = isActive(href);
                    const badge = getBadge(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={onClose}
                            className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                                active
                                    ? 'bg-gray-900 dark:bg-indigo-600 text-white'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-[#22252f]'
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'}`} />
                            <span className="flex-1">{label}</span>
                            {badge && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                    active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400 dark:bg-[#2d3140] dark:text-gray-500'
                                }`}>
                                    {badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 py-3 border-t border-gray-100 dark:border-[#2d3140]">
                <Link
                    href="/"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-[#22252f] transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>

            {/* Support banner */}
            <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                    Ran into an issue?{' '}
                    <a href="mailto:midasmatchsupport@gmail.com" className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300 transition-colors">
                        Contact support
                    </a>
                </p>
            </div>

            {/* Footer links */}
            <div className="px-5 py-2.5 border-t border-gray-100 dark:border-[#2d3140] flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-300 dark:text-gray-600">
                <a href="/privacy" className="hover:text-gray-500 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-gray-500 transition-colors">Terms</a>
                <a href="/refund" className="hover:text-gray-500 transition-colors">Refund</a>
            </div>
        </aside>
        </>
    );
}
