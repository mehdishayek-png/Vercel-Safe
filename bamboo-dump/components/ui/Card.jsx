import { motion } from 'framer-motion';
import { cn } from './Button';

export function Card({ children, className, hover = false, ...props }) {
    return (
        <motion.div
            initial={hover ? { y: 0 } : undefined}
            whileHover={hover ? { y: -5 } : undefined}
            className={cn(
                "relative rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-xl transition-all duration-300",
                "shadow-sm hover:shadow-lg hover:border-blue-200",
                "before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-gradient-to-b before:from-white before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
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
