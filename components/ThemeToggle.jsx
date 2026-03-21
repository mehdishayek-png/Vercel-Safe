'use client';
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        // Check localStorage or system preference
        const stored = localStorage.getItem('midas_theme');
        if (stored === 'dark') {
            setDark(true);
            document.documentElement.classList.add('dark');
        } else if (stored === 'light') {
            setDark(false);
            document.documentElement.classList.remove('dark');
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        if (next) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('midas_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('midas_theme', 'light');
        }
    };

    return (
        <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
    );
}
