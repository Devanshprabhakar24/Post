import { motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import useMagnet from '../hooks/useMagnet';
import ParticleHeart from './ParticleHeart';
import SlotCounter from './SlotCounter';

function LikeButton({ isLiked, likes, onToggle, disabled = false }) {
    const reduced = useReducedMotion();
    const [burstKey, setBurstKey] = useState(0);
    const magnet = useMagnet();

    const label = useMemo(
        () => (isLiked ? `Unlike post, ${likes} likes` : `Like post, ${likes} likes`),
        [isLiked, likes]
    );

    const onClick = () => {
        if (disabled) {
            return;
        }

        if (!isLiked) {
            setBurstKey((current) => current + 1);
        }

        onToggle?.();
    };

    return (
        <motion.button
            ref={magnet.ref}
            style={magnet.style}
            onMouseMove={magnet.onMouseMove}
            onMouseLeave={magnet.onMouseLeave}
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={isLiked}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            className={`magnetic-hit relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ui-font text-xs tracking-wide transition ${
                isLiked
                    ? 'border-volt/80 bg-volt/20 text-paper'
                    : 'border-mist/45 bg-transparent text-mist hover:border-volt/60 hover:text-paper'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
            <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <motion.span
                    key={isLiked ? 'liked' : 'idle'}
                    initial={reduced ? { scale: 1 } : { scale: 0.6 }}
                    animate={
                        reduced
                            ? { scale: 1 }
                            : isLiked
                                ? { scale: [0.6, 1.4, 1], rotate: [-12, 8, 0] }
                                : { scale: [0.8, 1], rotate: [0, 0] }
                    }
                    transition={reduced ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-20"
                >
                    <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-current text-volt' : 'text-mist'}`} />
                </motion.span>

                {isLiked && !reduced && (
                    <motion.span
                        initial={{ scale: 0.2, opacity: 0.9 }}
                        animate={{ scale: 1.9, opacity: 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full border border-volt"
                    />
                )}

                <ParticleHeart burstKey={burstKey} />
            </span>

            <SlotCounter value={Number(likes) || 0} className="min-w-[1.5rem] text-right" />
        </motion.button>
    );
}

export default memo(LikeButton);
