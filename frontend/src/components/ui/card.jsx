import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
    return (
        <div
            className={cn(
                'rounded-3xl border border-mist/35 bg-ink-soft/80 backdrop-blur-xl shadow-soft',
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
