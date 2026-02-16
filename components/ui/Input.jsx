import { forwardRef } from 'react';
import { cn } from './Button';

export const Input = forwardRef(({ className, icon: Icon, label, error, ...props }, ref) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="text-xs font-medium text-white/50 ml-1 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-indigo-400 transition-colors">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 transition-all duration-300",
                        "focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10",
                        "hover:border-white/20",
                        Icon && "pl-11",
                        error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/10",
                        className
                    )}
                    {...props}
                />
                {/* Animated bottom shimmer line */}
                <div className="absolute bottom-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
            </div>
            {error && (
                <p className="text-xs text-red-400 ml-1">{error}</p>
            )}
        </div>
    );
});
Input.displayName = "Input";
