import { cn } from '../../lib/utils';

function Badge({ className, ...props }) {
    return (
        <span
            className={cn(
                'ui-font inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]',
                className
            )}
            {...props}
        />
    );
}

export { Badge };
