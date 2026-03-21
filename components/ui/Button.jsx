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
        primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-button border-0",
        secondary: "bg-white dark:bg-[#1a1d27] border border-surface-200 dark:border-[#2d3140] text-gray-700 dark:text-gray-200 hover:bg-surface-50 dark:hover:bg-[#22252f] hover:text-gray-900 dark:hover:text-white shadow-button",
        outline: "bg-transparent border border-surface-200 dark:border-[#2d3140] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-surface-300 dark:hover:border-[#3d4155]",
        ghost: "bg-transparent text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-[#22252f]",
        accent: "bg-accent-600 hover:bg-accent-700 text-white shadow-button border-0",
    };

    const sizes = {
        sm: "h-10 px-3 text-xs rounded-lg",
        md: "h-10 px-5 text-sm rounded-[10px]",
        lg: "h-12 px-8 text-base rounded-xl",
        xl: "h-14 px-10 text-base font-semibold rounded-xl"
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
