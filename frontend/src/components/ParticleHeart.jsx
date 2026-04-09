import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

const glyphs = ['❤', '✦', '★', '•'];

export default function ParticleHeart({ burstKey }) {
    const reduced = useReducedMotion();

    const particles = useMemo(
        () => Array.from({ length: 12 }).map((_, index) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 50;
            return {
                id: `${burstKey}-${index}`,
                glyph: glyphs[index % glyphs.length],
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                rotate: Math.random() * 220 - 110,
                duration: 0.42 + Math.random() * 0.3
            };
        }),
        [burstKey]
    );

    if (reduced) {
        return null;
    }

    return (
        <span className="pointer-events-none absolute inset-0 z-20">
            {particles.map((particle) => (
                <motion.span
                    key={particle.id}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.9, rotate: 0 }}
                    animate={{
                        x: particle.x,
                        y: particle.y,
                        opacity: 0,
                        scale: 1.4,
                        rotate: particle.rotate
                    }}
                    transition={{ duration: particle.duration, ease: 'easeOut' }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-[var(--volt)]"
                >
                    {particle.glyph}
                </motion.span>
            ))}
        </span>
    );
}
