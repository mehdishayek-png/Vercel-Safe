import { motion } from 'framer-motion';
import { cn } from './Button';

export function Card({ children, className, hover = false, ...props }) {
    return (
        <motion.div
            initial={hover ? { y: 0 } : undefined}
            whileHover={hover ? { y: -3 } : undefined}
            className={cn(
                "relative rounded-xl border border-surface-200 bg-white shadow-card transition-all duration-200",
                hover && "hover:shadow-card-hover hover:border-surface-300",
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
