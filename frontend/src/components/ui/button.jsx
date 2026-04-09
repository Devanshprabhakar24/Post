import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    'ui-font inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs uppercase tracking-[0.14em] transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60',
    {
        variants: {
            variant: {
                default: 'border border-volt/70 bg-volt text-ink shadow-soft hover:-translate-y-[1px] hover:bg-volt-soft',
                ghost: 'border border-mist/35 bg-transparent text-mist hover:border-volt/65 hover:text-paper',
                secondary: 'border border-mist/35 bg-paper/6 text-paper hover:border-mist/60 hover:bg-paper/10',
                danger: 'border border-ember/70 bg-ember/90 text-paper hover:-translate-y-[1px] hover:bg-ember'
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
