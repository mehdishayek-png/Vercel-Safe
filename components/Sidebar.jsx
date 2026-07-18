'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bookmark, BriefcaseBusiness, Home, LifeBuoy, Search, Settings, Sparkles, X } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useJobsStore } from '@/stores/jobs-store';

const NAV_ITEMS = [
    { href: '/dashboard', icon: Home, label: 'Overview' },
    { href: '/dashboard/search', icon: Search, label: 'Discover' },
    { href: '/dashboard/saved', icon: Bookmark, label: 'Shortlist' },
    { href: '/dashboard/applications', icon: BriefcaseBusiness, label: 'Pipeline' },
    { href: '/dashboard/prep', icon: BarChart3, label: 'Interview lab' },
    { href: '/dashboard/settings', icon: Settings, label: 'Profile & settings' },
];

export function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { user } = useUser();
    const savedCount = useJobsStore(state => state.savedJobIds.size);
    const appliedCount = useJobsStore(state => state.appliedJobIds.size);

    const badgeFor = href => {
        if (href === '/dashboard/saved') return savedCount;
        if (href === '/dashboard/applications') return appliedCount;
        return 0;
    };

    return (
        <>
            {isOpen && <button className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" onClick={onClose} aria-label="Close navigation" />}
            <aside className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col border-r border-slate-900/10 bg-[#f1f0eb] px-4 py-5 transition-transform md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between px-2">
                    <Link href="/" className="flex items-center gap-3" onClick={onClose}>
                        <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-slate-900 font-headline text-sm font-extrabold text-white">M</span>
                        <span>
                            <span className="block font-headline text-[14px] font-extrabold leading-none text-slate-900">Midas Match</span>
                            <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.15em] text-slate-500">Career intelligence</span>
                        </span>
                    </Link>
                    <button onClick={onClose} className="grid h-8 w-8 place-items-center text-slate-500 md:hidden" aria-label="Close navigation"><X className="h-5 w-5" /></button>
                </div>

                <div className="mx-2 my-6 rounded-xl border border-brand-200/70 bg-brand-50 p-3.5">
                    <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                        <Sparkles className="h-3.5 w-3.5" /> Intelligence layer
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">Multi-source search, deterministic scoring, and semantic re-ranking.</p>
                </div>

                <nav className="space-y-1" aria-label="Dashboard navigation">
                    {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                        const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
                        const badge = badgeFor(href);
                        return (
                            <Link key={href} href={href} onClick={onClose} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${active ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-600 hover:bg-white/60 hover:text-slate-950'}`}>
                                <Icon className={`h-[17px] w-[17px] ${active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                <span className="flex-1">{label}</span>
                                {badge > 0 && <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] text-white">{badge}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto border-t border-slate-900/10 pt-4">
                    <a href="mailto:midasmatchsupport@gmail.com" className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-white/60">
                        <LifeBuoy className="h-4 w-4 text-slate-400" /> Support
                    </a>
                    <SignedIn>
                        <div className="flex items-center gap-3 rounded-xl bg-white/70 p-3 ring-1 ring-slate-900/5">
                            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
                            <div className="min-w-0">
                                <p className="truncate text-[12px] font-bold text-slate-900">{user?.fullName || user?.firstName || 'Your account'}</p>
                                <p className="truncate text-[10px] text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p>
                            </div>
                        </div>
                    </SignedIn>
                    <SignedOut>
                        <SignInButton mode="modal"><button className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Sign in</button></SignInButton>
                    </SignedOut>
                </div>
            </aside>
        </>
    );
}
