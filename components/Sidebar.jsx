'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, Bookmark, Briefcase, User, Settings, LogOut, ChevronLeft, X, GraduationCap, HelpCircle, Sparkles } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useJobsStore } from '@/stores/jobs-store';

const NAV_ITEMS = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/dashboard/search', icon: Search, label: 'Search Jobs' },
    { href: '/dashboard/saved', icon: Bookmark, label: 'Saved Jobs' },
    { href: '/dashboard/applications', icon: Briefcase, label: 'Applications' },
    { href: '/dashboard/prep', icon: GraduationCap, label: 'Interview Prep' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { user } = useUser();
    const savedJobIds = useJobsStore(s => s.savedJobIds);
    const appliedJobIds = useJobsStore(s => s.appliedJobIds);

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
            {isOpen && (
                <div className="fixed inset-0 bg-black/30 z-50 md:hidden" onClick={onClose} />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-[264px] bg-slate-50/70 backdrop-blur-xl shadow-sidebar flex flex-col p-6 space-y-2 min-h-screen transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:w-[264px] md:z-auto md:sticky md:top-0 md:shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="mb-10 px-2">
                    <div className="text-xl font-bold bg-gradient-to-br from-brand-600 to-accent-600 bg-clip-text text-transparent font-headline">Midas Match</div>
                    <div className="text-xs text-slate-500 font-medium tracking-tight">AI Career Concierge</div>
                    <button onClick={onClose} className="absolute top-6 right-4 p-1 text-gray-400 hover:text-gray-600 md:hidden cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1">
                    {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                        const active = isActive(href);
                        const badge = getBadge(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-headline tracking-tight text-sm transition-all duration-300 ${
                                    active
                                        ? 'bg-brand-50 text-brand-700 font-semibold'
                                        : 'text-slate-500 hover:bg-slate-200/50'
                                }`}
                            >
                                <Icon className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : ''}`} />
                                <span className="flex-1">{label}</span>
                                {badge && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-lg ${
                                        active ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="mt-auto pt-6 border-t border-slate-100">
                    {/* User */}
                    <div className="mb-4 px-2">
                        <SignedIn>
                            <div className="flex items-center gap-2.5">
                                <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                                <div className="min-w-0">
                                    <p className="text-[12px] font-medium text-gray-900 truncate">{user?.firstName || 'User'}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{user?.primaryEmailAddress?.emailAddress || ''}</p>
                                </div>
                            </div>
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="w-full px-4 py-2 text-[12px] font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer">Sign In</button>
                            </SignInButton>
                        </SignedOut>
                    </div>

                    <Link href="/" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-200/50 transition-all duration-300 rounded-xl font-headline tracking-tight text-sm">
                        <HelpCircle className="w-[18px] h-[18px]" />
                        <span>Help Center</span>
                    </Link>

                    {/* Support banner */}
                    <div className="mt-4 mx-0 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200/60">
                        <p className="text-[11px] text-amber-700 leading-snug">
                            Issue?{' '}
                            <a href="mailto:midasmatchsupport@gmail.com" className="font-semibold underline underline-offset-2">Contact support</a>
                        </p>
                    </div>

                    {/* Footer links */}
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-300 px-2">
                        <a href="/privacy" className="hover:text-gray-500 transition-colors">Privacy</a>
                        <a href="/terms" className="hover:text-gray-500 transition-colors">Terms</a>
                        <a href="/refund" className="hover:text-gray-500 transition-colors">Refund</a>
                    </div>
                </div>
            </aside>
        </>
    );
}
