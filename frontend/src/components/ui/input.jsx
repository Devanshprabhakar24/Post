import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(function Input({ className, ...props }, ref) {
    return (
        <input
            ref={ref}
            className={cn(
                'font-body flex h-11 w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/55',
                className
            )}
            {...props}
        />
    );
});

export { Input };
