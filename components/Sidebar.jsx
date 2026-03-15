'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, Bookmark, Briefcase, User, Settings, LogOut, ChevronLeft } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useApp } from '@/contexts/AppContext';

const NAV_ITEMS = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/dashboard/search', icon: Search, label: 'Search Jobs' },
    { href: '/dashboard/saved', icon: Bookmark, label: 'Saved Jobs' },
    { href: '/dashboard/applications', icon: Briefcase, label: 'Applications' },
];

export function Sidebar() {
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
        <aside className="w-[240px] shrink-0 bg-gray-950 text-white flex flex-col min-h-screen sticky top-0">
            {/* Logo */}
            <div className="px-5 h-16 flex items-center gap-3 border-b border-white/10">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
                    M
                </div>
                <span className="text-[15px] font-bold tracking-tight">Midas Match</span>
            </div>

            {/* User info */}
            <div className="px-4 py-4 border-b border-white/10">
                <SignedIn>
                    <div className="flex items-center gap-3">
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "w-9 h-9",
                                    userButtonPopoverCard: "bg-gray-900 border border-white/10",
                                }
                            }}
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user?.firstName || 'User'}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                                {user?.primaryEmailAddress?.emailAddress || 'Job Seeker'}
                            </p>
                        </div>
                    </div>
                </SignedIn>
                <SignedOut>
                    <SignInButton mode="modal">
                        <button className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors cursor-pointer">
                            Sign In
                        </button>
                    </SignInButton>
                </SignedOut>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const active = isActive(href);
                    const badge = getBadge(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                                active
                                    ? 'bg-brand-600/20 text-brand-400'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon className={`w-[18px] h-[18px] ${active ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                            <span className="flex-1">{label}</span>
                            {badge && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                    active ? 'bg-brand-600/30 text-brand-300' : 'bg-white/10 text-gray-400'
                                }`}>
                                    {badge}
                                </span>
                            )}
                            {active && (
                                <div className="w-1 h-5 rounded-full bg-brand-500 absolute right-0" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 py-4 border-t border-white/10 space-y-1">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                >
                    <ChevronLeft className="w-[18px] h-[18px]" />
                    Back to Home
                </Link>
            </div>

            {/* Footer links */}
            <div className="px-5 py-3 border-t border-white/10 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-600">
                <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-gray-400 transition-colors">Terms</a>
                <a href="/refund" className="hover:text-gray-400 transition-colors">Refund</a>
            </div>
        </aside>
    );
}
