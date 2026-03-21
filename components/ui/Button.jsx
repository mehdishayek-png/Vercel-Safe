import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function Button({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    icon: Icon,
    ...props
}) {
    const variants = {
        primary: "bg-brand-500 hover:bg-brand-600 text-white shadow-button border-0",
        secondary: "bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-200 hover:bg-surface-50 dark:hover:bg-ink-800 hover:text-ink-900 dark:hover:text-white shadow-button",
        outline: "bg-transparent border border-ink-200 dark:border-ink-800 text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white hover:border-ink-300 dark:hover:border-ink-700",
        ghost: "bg-transparent text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-ink-800",
        'ghost-dark': "bg-transparent text-ink-400 hover:text-white border border-ink-800 hover:border-ink-600",
        accent: "bg-brand-400 hover:bg-brand-300 text-ink-950 shadow-gold border-0 font-semibold",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-10 px-5 text-sm rounded-[8px]",
        lg: "h-11 px-7 text-sm rounded-[10px]",
        xl: "h-12 px-8 text-sm font-semibold rounded-[10px]"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "relative font-medium transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isLoading && Icon && <Icon className="w-4 h-4" />}
            {children}
        </motion.button>
    );
}
