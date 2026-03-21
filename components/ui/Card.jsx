import { motion } from 'framer-motion';
import { cn } from './Button';

export function Card({ children, className, hover = false, ...props }) {
    return (
        <motion.div
            initial={hover ? { y: 0 } : undefined}
            whileHover={hover ? { y: -2 } : undefined}
            className={cn(
                "relative rounded-[10px] border border-ink-200 dark:border-ink-800 bg-white dark:bg-[#1C1B19] shadow-card transition-all duration-200",
                hover && "hover:shadow-card-hover hover:border-ink-300 dark:hover:border-ink-700",
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
