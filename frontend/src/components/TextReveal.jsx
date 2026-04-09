import { motion, useReducedMotion } from 'framer-motion';

export default function TextReveal({ text, className = '' }) {
    const reduced = useReducedMotion();
    const words = String(text || '').split(' ').filter(Boolean);

    return (
        <span className={className}>
            {words.map((word, index) => (
                <span key={`${word}-${index}`} className="mr-[0.22em] inline-block overflow-hidden align-bottom">
                    <motion.span
                        initial={reduced ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={reduced ? { duration: 0 } : { duration: 0.55, delay: index * 0.08, ease: [0.76, 0, 0.24, 1] }}
                        className="inline-block"
                    >
                        {word}
                    </motion.span>
                </span>
            ))}
        </span>
    );
}
