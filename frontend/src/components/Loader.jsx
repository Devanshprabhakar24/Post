import { motion, useReducedMotion } from 'framer-motion';

const letters = 'LOADING'.split('');

export default function Loader({ count = 6 }) {
    const reduced = useReducedMotion();

    return (
        <div className="space-y-4">
            <div className="editorial-surface rounded-2xl p-6 text-center">
                <div className="inline-flex items-center justify-center gap-1">
                    {letters.map((letter, index) => (
                        <motion.span
                            key={`${letter}-${index}`}
                            className="font-display text-5xl text-[var(--text-primary)]"
                            animate={
                                reduced
                                    ? { opacity: 1, y: 0 }
                                    : { y: [0, -8, 0], opacity: [0.4, 1, 0.5] }
                            }
                            transition={
                                reduced
                                    ? { duration: 0 }
                                    : { repeat: Infinity, duration: 1.1, delay: index * 0.06 }
                            }
                        >
                            {letter}
                        </motion.span>
                    ))}
                </div>
                <div className="mt-3 h-[2px] overflow-hidden rounded-full bg-mist/20">
                    <span className="block h-full origin-left bg-volt" style={{ animation: reduced ? 'none' : 'progress-bar-fill 1.2s infinite' }} />
                </div>
            </div>

            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="skeleton h-48 rounded-2xl border border-[var(--border-soft)]/40" />
            ))}
        </div>
    );
}
