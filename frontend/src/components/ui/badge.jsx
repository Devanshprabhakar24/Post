import { cn } from '../../lib/utils';

function Badge({ className, ...props }) {
    return (
        <span
            className={cn(
                'ui-font inline-flex items-center rounded-full border border-mist/35 bg-paper/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-mist',
                className
            )}
            {...props}
        />
    );
}

export { Badge };
