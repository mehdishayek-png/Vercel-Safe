import { forwardRef } from 'react';
import { cn } from './Button';

export const Input = forwardRef(({ className, icon: Icon, label, error, ...props }, ref) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="text-xs font-medium text-gray-500 ml-1 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-all duration-300",
                        "focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10",
                        "hover:border-blue-300",
                        Icon && "pl-11",
                        error && "border-red-300 focus:border-red-500 focus:ring-red-500/10",
                        className
                    )}
                    {...props}
                />
                {/* Animated bottom shimmer line */}
                <div className="absolute bottom-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
            </div>
            {error && (
                <p className="text-xs text-red-400 ml-1">{error}</p>
            )}
        </div>
    );
});
Input.displayName = "Input";
