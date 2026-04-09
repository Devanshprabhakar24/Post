import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

export default function ReadingProgress() {
    const reduced = useReducedMotion();
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 140,
        damping: 24,
        mass: 0.2
    });

    return (
        <motion.div
            aria-hidden="true"
            className="fixed left-0 right-0 top-0 z-[90] h-[2px] origin-left bg-[var(--volt)]"
            style={reduced ? { scaleX: 1 } : { scaleX }}
        />
    );
}
