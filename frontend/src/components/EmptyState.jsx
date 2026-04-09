import { motion, useReducedMotion } from 'framer-motion';

export default function EmptyState({ title = 'NOTHING YET', description = 'Your feed is quiet right now. Try changing search, filters, or publish the first spark.' }) {
    const reduced = useReducedMotion();

    return (
        <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="editorial-surface rounded-3xl px-6 py-12 text-center"
        >
            <h3 className="font-display text-[clamp(3rem,12vw,5rem)] leading-[0.88] text-paper">{title}</h3>
            <p className="mx-auto mt-4 max-w-xl font-body text-lg italic text-mist">{description}</p>
            <svg className="mx-auto mt-6 h-3 w-64" viewBox="0 0 256 8" fill="none" aria-hidden="true">
                <motion.path
                    d="M2 6C74 2 182 2 254 6"
                    stroke="var(--volt)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: reduced ? 0 : 0.9, ease: 'easeInOut' }}
                />
            </svg>
        </motion.div>
    );
}
