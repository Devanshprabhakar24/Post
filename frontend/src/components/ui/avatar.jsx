import { User2 } from 'lucide-react';
import { cn } from '../../lib/utils';

function Avatar({ className, name, src = '', online = false }) {
    const first = name?.trim()?.charAt(0)?.toUpperCase();
    const hasImage = Boolean(String(src || '').trim());

    return (
        <div
            className={cn(
                'relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-blue-500/40 to-cyan-500/30 text-xs font-semibold text-white',
                className
            )}
        >
            {hasImage ? (
                <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" loading="lazy" />
            ) : (
                first || <User2 className="h-4 w-4" />
            )}
            {online && (
                <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
            )}
        </div>
    );
}

export { Avatar };
