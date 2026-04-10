import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    'ui-font inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs uppercase tracking-[0.14em] transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60',
    {
        variants: {
            variant: {
                default: 'border border-volt/70 bg-volt text-[#090b10] shadow-soft hover:-translate-y-[1px] hover:opacity-90',
                ghost: 'border border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--accent-red)]/65 hover:text-[var(--text-primary)]',
                secondary: 'border border-[var(--border-soft)] bg-[var(--bg-card-soft)] text-[var(--text-primary)] hover:border-[var(--border-soft)] hover:bg-[var(--bg-card-soft)]',
                danger: 'border border-[var(--accent-red)]/70 bg-[var(--accent-red)] text-white hover:-translate-y-[1px] hover:opacity-90'
            },
            size: {
                default: 'h-10 px-5',
                sm: 'h-8 px-3 text-[10px] tracking-[0.16em]',
                lg: 'h-12 px-7 text-sm',
                icon: 'h-10 w-10 p-0'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
);

function Button({ className, variant, size, asChild = false, ...props }) {
    const Comp = asChild ? 'span' : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
