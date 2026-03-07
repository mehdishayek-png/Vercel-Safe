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
        primary: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-right text-white shadow-lg shadow-blue-600/20 border-0",
        secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm",
        outline: "bg-transparent border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300",
        ghost: "bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100",
        glow: "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg font-semibold"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "relative rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
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
