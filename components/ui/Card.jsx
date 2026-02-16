import { motion } from 'framer-motion';
import { cn } from './Button';

export function Card({ children, className, hover = false, ...props }) {
    return (
        <motion.div
            initial={hover ? { y: 0 } : undefined}
            whileHover={hover ? { y: -5 } : undefined}
            className={cn(
                "relative rounded-2xl border border-white/10 bg-[#0A0A0A]/60 backdrop-blur-xl transition-colors duration-300",
                "shadow-[0_4px_20px_-1px_rgba(0,0,0,0.2)]",
                "before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-gradient-to-b before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function CardHeader({ children, className }) {
    return <div className={cn("p-6 pb-2", className)}>{children}</div>;
}

export function CardContent({ children, className }) {
    return <div className={cn("p-6 pt-2", className)}>{children}</div>;
}
