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
                    className="fixed inset-0 bg-ink-950/40 z-50 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-[#1C1B19] border-r border-ink-200 dark:border-ink-800 text-ink-700 flex flex-col min-h-screen transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:w-[220px] md:z-auto md:sticky md:top-0 md:shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="px-5 h-12 flex items-center gap-2 border-b border-ink-200 dark:border-ink-800">
                    <span className="font-display text-[14px] font-bold text-ink-900 dark:text-ink-50 tracking-tight flex-1">Midas Match</span>
                    <button onClick={onClose} className="p-1 text-ink-400 hover:text-ink-600 md:hidden cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

            {/* User info */}
            <div className="px-4 py-3.5 border-b border-ink-200 dark:border-ink-800">
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
                            <p className="text-[12px] font-medium text-ink-900 dark:text-ink-100 truncate">
                                {user?.firstName || 'User'}
                            </p>
                            <p className="text-[10px] text-ink-400 dark:text-ink-500 truncate">
                                {user?.primaryEmailAddress?.emailAddress || 'Job Seeker'}
                            </p>
                        </div>
                    </div>
                </SignedIn>
                <SignedOut>
                    <SignInButton mode="modal">
                        <button className="w-full px-4 py-2 text-[12px] font-semibold text-ink-950 bg-brand-400 hover:bg-brand-500 rounded-md transition-colors cursor-pointer">
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
                            className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150 group ${
                                active
                                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                                    : 'text-ink-500 hover:text-ink-900 hover:bg-surface-100 dark:text-ink-400 dark:hover:text-ink-100 dark:hover:bg-ink-800'
                            }`}
                        >
                            {/* Gold active indicator */}
                            {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r-full" />}
                            <Icon className={`w-4 h-4 ${active ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400 group-hover:text-ink-600 dark:text-ink-500 dark:group-hover:text-ink-300'}`} />
                            <span className="flex-1">{label}</span>
                            {badge && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                    active ? 'bg-brand-100 dark:bg-brand-800/30 text-brand-700 dark:text-brand-400' : 'bg-ink-100 dark:bg-ink-800 text-ink-400 dark:text-ink-500'
                                }`}>
                                    {badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 py-3 border-t border-ink-200 dark:border-ink-800">
                <Link
                    href="/"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium text-ink-400 hover:text-ink-700 hover:bg-surface-100 dark:text-ink-500 dark:hover:text-ink-300 dark:hover:bg-ink-800 transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>

            {/* Support banner */}
            <div className="mx-3 mb-2 px-3 py-2.5 rounded-md bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800/30">
                <p className="text-[11px] text-brand-700 dark:text-brand-400 leading-snug">
                    Ran into an issue?{' '}
                    <a href="mailto:midasmatchsupport@gmail.com" className="font-semibold underline underline-offset-2 hover:text-brand-900 dark:hover:text-brand-300 transition-colors">
                        Contact support
                    </a>
                </p>
            </div>

            {/* Footer links */}
            <div className="px-5 py-2.5 border-t border-ink-200 dark:border-ink-800 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-300 dark:text-ink-600">
                <a href="/privacy" className="hover:text-ink-500 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-ink-500 transition-colors">Terms</a>
                <a href="/refund" className="hover:text-ink-500 transition-colors">Refund</a>
            </div>
        </aside>
        </>
    );
}
