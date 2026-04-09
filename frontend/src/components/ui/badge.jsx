import { cn } from '../../lib/utils';

function Badge({ className, ...props }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200',
                className
            )}
            {...props}
        />
    );
}

export { Badge };
