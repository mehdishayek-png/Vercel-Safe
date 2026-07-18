'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

const NAV_ITEMS = [
    { href: '#product', label: 'Product' },
    { href: '#method', label: 'How it works' },
    { href: '#trust', label: 'Trust' },
];

export function Header() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className={`fixed inset-x-0 top-0 z-50 border-b transition-colors ${scrolled || open ? 'border-slate-900/10 bg-[#f7f6f2]/95 backdrop-blur-xl' : 'border-transparent bg-transparent'}`}>
            <div className="mm-shell flex h-[72px] items-center justify-between">
                <Link href="/" className="flex items-center gap-3" aria-label="Midas Match home">
                    <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-slate-900 font-headline text-sm font-extrabold text-white">M</span>
                    <span>
                        <span className="block font-headline text-[15px] font-extrabold leading-none tracking-tight text-slate-900">Midas Match</span>
                        <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.16em] text-slate-500">Career intelligence</span>
                    </span>
                </Link>

                <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
                    {NAV_ITEMS.map(item => (
                        <a key={item.href} href={item.href} className="text-[13px] font-semibold text-slate-600 transition-colors hover:text-slate-950">
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-3 md:flex">
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="px-3 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-950">Sign in</button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
                    </SignedIn>
                    <Link href="/dashboard/search" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-600">
                        Find my matches <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </div>

                <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-xl border border-slate-900/10 text-slate-700 md:hidden"
                    onClick={() => setOpen(value => !value)}
                    aria-expanded={open}
                    aria-label="Toggle navigation"
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {open && (
                <div className="border-t border-slate-900/10 bg-[#f7f6f2] px-4 pb-5 pt-3 md:hidden">
                    <nav className="flex flex-col" aria-label="Mobile navigation">
                        {NAV_ITEMS.map(item => (
                            <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="border-b border-slate-900/5 px-2 py-3 text-sm font-semibold text-slate-700">
                                {item.label}
                            </a>
                        ))}
                    </nav>
                    <Link href="/dashboard/search" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
                        Find my matches <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </div>
            )}
        </header>
    );
}
