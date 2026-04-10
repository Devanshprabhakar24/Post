import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
    return (
        <div
            className={cn(
                'rounded-3xl border border-[var(--border-soft)] bg-[var(--bg-card)] backdrop-blur-xl shadow-[var(--shadow-editorial)]',
                className
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }) {
    return <div className={cn('p-5 pb-0', className)} {...props} />;
}

function CardContent({ className, ...props }) {
    return <div className={cn('p-5', className)} {...props} />;
}

function CardFooter({ className, ...props }) {
    return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export { Card, CardHeader, CardContent, CardFooter };
