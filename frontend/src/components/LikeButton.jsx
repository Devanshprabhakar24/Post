import { motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { memo } from 'react';

function LikeButton({ isLiked, likes, onToggle, disabled = false }) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-pressed={isLiked}
            aria-label={isLiked ? `Unlike post, ${likes} likes` : `Like post, ${likes} likes`}
            whileTap={{ scale: 0.9 }}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isLiked
                    ? 'border-rose-400/70 bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                    : 'border-slate-300 bg-white/90 text-slate-700 hover:border-cyan-500/60 hover:text-cyan-700 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-cyan-400/70 dark:hover:text-cyan-200'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            <motion.span
                key={isLiked ? 'liked' : 'idle'}
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={prefersReducedMotion ? { scale: 1, opacity: 1 } : { scale: [1, 1.3, 1], opacity: 1 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
                className="relative text-sm"
            >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current text-rose-600 dark:text-rose-300' : 'text-slate-500 dark:text-slate-300'}`} />
                {isLiked && (
                    <motion.span
                        initial={{ scale: 0.2, opacity: 0.5 }}
                        animate={prefersReducedMotion ? { scale: 1, opacity: 0 } : { scale: 1.8, opacity: 0 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.35 }}
                        className="absolute inset-0 rounded-full border border-rose-300"
                    />
                )}
            </motion.span>
            <span>{likes}</span>
        </motion.button>
    );
}

export default memo(LikeButton);
