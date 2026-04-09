import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export default function SlotCounter({ value, className = '' }) {
    const reduced = useReducedMotion();

    return (
        <span className={`relative inline-flex h-[1.2em] overflow-hidden ${className}`.trim()}>
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={String(value)}
                    initial={reduced ? { opacity: 1 } : { y: '100%', opacity: 0 }}
                    animate={reduced ? { opacity: 1 } : { y: '0%', opacity: 1 }}
                    exit={reduced ? { opacity: 1 } : { y: '-100%', opacity: 0 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.32, ease: [0.76, 0, 0.24, 1] }}
                    className="inline-block"
                >
                    {value}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}
