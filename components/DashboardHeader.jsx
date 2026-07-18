'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CircleHelp, Menu, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useJobsStore } from '@/stores/jobs-store';

const PAGE_META = {
    '/dashboard': ['Overview', 'Your search activity and next actions'],
    '/dashboard/search': ['Discover', 'Search the market against your profile'],
    '/dashboard/saved': ['Shortlist', 'Review the roles worth pursuing'],
    '/dashboard/applications': ['Pipeline', 'Track every active application'],
    '/dashboard/prep': ['Interview lab', 'Turn job context into a preparation plan'],
    '/dashboard/settings': ['Profile & settings', 'Keep your matching context current'],
};

export function DashboardHeader({ onMenuClick }) {
    const pathname = usePathname();
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const panelRef = useRef(null);
    const saved = useJobsStore(state => state.savedJobsData.length);
    const applied = useJobsStore(state => state.appliedJobsData.length);
    const metaKey = Object.keys(PAGE_META).find(key => key !== '/dashboard' && pathname.startsWith(key)) || '/dashboard';
    const [title, subtitle] = PAGE_META[metaKey];

    useEffect(() => {
        if (!notificationsOpen) return undefined;
        const close = event => {
            if (panelRef.current && !panelRef.current.contains(event.target)) setNotificationsOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [notificationsOpen]);

    return (
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-900/10 bg-[#f7f6f2]/92 px-4 backdrop-blur-xl md:px-7">
            <div className="flex min-w-0 items-center gap-3">
                <button onClick={onMenuClick} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-900/10 text-slate-600 md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
                <div className="min-w-0">
                    <p className="truncate font-headline text-[16px] font-extrabold tracking-tight text-slate-900">{title}</p>
                    <p className="hidden truncate text-[10px] text-slate-500 sm:block">{subtitle}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {pathname !== '/dashboard/search' && (
                    <Link href="/dashboard/search" className="hidden items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-brand-600 sm:flex">
                        <Search className="h-3.5 w-3.5" /> New search
                    </Link>
                )}
                <a href="mailto:midasmatchsupport@gmail.com" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-900" aria-label="Contact support"><CircleHelp className="h-[18px] w-[18px]" /></a>
                <div className="relative" ref={panelRef}>
                    <button onClick={() => setNotificationsOpen(value => !value)} className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-900" aria-label="Activity summary">
                        <Bell className="h-[18px] w-[18px]" />
                        {(saved + applied) > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-500 ring-2 ring-[#f7f6f2]" />}
                    </button>
                    <AnimatePresence>
                        {notificationsOpen && (
                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 mt-2 w-[min(88vw,320px)] overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-elevated">
                                <div className="flex items-center justify-between border-b border-slate-900/10 px-4 py-3">
                                    <p className="text-xs font-bold text-slate-900">Search activity</p>
                                    <button onClick={() => setNotificationsOpen(false)} className="text-slate-400" aria-label="Close activity summary"><X className="h-4 w-4" /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-px bg-slate-900/10">
                                    <Link href="/dashboard/saved" onClick={() => setNotificationsOpen(false)} className="bg-white p-4 hover:bg-surface-50">
                                        <span className="font-mono text-xl font-semibold text-slate-900">{saved}</span>
                                        <span className="mt-1 block text-[10px] text-slate-500">Shortlisted roles</span>
                                    </Link>
                                    <Link href="/dashboard/applications" onClick={() => setNotificationsOpen(false)} className="bg-white p-4 hover:bg-surface-50">
                                        <span className="font-mono text-xl font-semibold text-slate-900">{applied}</span>
                                        <span className="mt-1 block text-[10px] text-slate-500">Applications</span>
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
