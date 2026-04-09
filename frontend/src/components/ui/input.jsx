import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(function Input({ className, ...props }, ref) {
    return (
        <input
            ref={ref}
            className={cn(
                'font-body flex h-11 w-full rounded-2xl border border-mist/35 bg-paper/8 px-3 py-2 text-sm text-paper placeholder:text-mist/75 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/55',
                className
            )}
            {...props}
        />
    );
});

export { Input };
