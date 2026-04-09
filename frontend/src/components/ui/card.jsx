import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-lg shadow-[0_14px_32px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_16px_40px_rgba(2,6,23,0.35)]',
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
