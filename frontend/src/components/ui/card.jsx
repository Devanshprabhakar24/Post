import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-[0_16px_40px_rgba(2,6,23,0.35)]',
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
