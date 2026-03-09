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
        secondary: "bg-white border border-surface-200 text-gray-700 hover:bg-surface-50 hover:text-gray-900 shadow-button",
        outline: "bg-transparent border border-surface-200 text-gray-600 hover:text-gray-900 hover:border-surface-300",
        ghost: "bg-transparent text-gray-500 hover:text-gray-900 hover:bg-surface-100",
        accent: "bg-accent-600 hover:bg-accent-700 text-white shadow-button border-0",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs rounded-lg",
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
