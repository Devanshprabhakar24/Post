import { User2 } from 'lucide-react';
import { cn } from '../../lib/utils';

function Avatar({ className, name, src = '', online = false }) {
    const first = name?.trim()?.charAt(0)?.toUpperCase();
    const hasImage = Boolean(String(src || '').trim());

    return (
        <div
            className={cn(
                'relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--border-soft)] bg-gradient-to-br from-volt/55 via-volt-soft/45 to-ember/45 text-xs font-semibold text-[var(--text-primary)]',
                className
            )}
        >
            {hasImage ? (
                <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" loading="lazy" />
            ) : (
                first || <User2 className="h-4 w-4" />
            )}
            {online && (
                <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-card)] bg-volt" />
            )}
        </div>
    );
}

export { Avatar };
