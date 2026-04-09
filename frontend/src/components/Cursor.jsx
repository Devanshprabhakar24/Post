import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Cursor() {
    const [enabled, setEnabled] = useState(false);
    const [interactive, setInteractive] = useState(false);

    const x = useMotionValue(-100);
    const y = useMotionValue(-100);
    const ringX = useSpring(x, { stiffness: 200, damping: 20 });
    const ringY = useSpring(y, { stiffness: 200, damping: 20 });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(pointer: coarse)');
        const apply = () => setEnabled(!mediaQuery.matches);
        apply();

        const onMove = (event) => {
            x.set(event.clientX);
            y.set(event.clientY);
        };

        const onOver = (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const hit = target.closest('a,button,[role="button"],input,textarea,select,label,.magnetic-hit');
            setInteractive(Boolean(hit));
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseover', onOver);
        mediaQuery.addEventListener('change', apply);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseover', onOver);
            mediaQuery.removeEventListener('change', apply);
        };
    }, [x, y]);

    if (!enabled) {
        return null;
    }

    return (
        <>
            <motion.span
                aria-hidden="true"
                className="pointer-events-none fixed z-[120] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--volt)]"
                style={{ x, y }}
            />
            <motion.span
                aria-hidden="true"
                className="pointer-events-none fixed z-[119] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--volt)] mix-blend-difference"
                animate={{ width: interactive ? 60 : 40, height: interactive ? 60 : 40 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                style={{ x: ringX, y: ringY }}
            />
        </>
    );
}
