import { useMemo, useRef } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

export default function useMagnet({ strength = 8, stiffness = 400, damping = 30 } = {}) {
    const elementRef = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springX = useSpring(x, { stiffness, damping });
    const springY = useSpring(y, { stiffness, damping });

    const api = useMemo(
        () => ({
            ref: elementRef,
            style: { x: springX, y: springY },
            onMouseMove: (event) => {
                const el = elementRef.current;
                if (!el) {
                    return;
                }

                const rect = el.getBoundingClientRect();
                const offsetX = event.clientX - (rect.left + rect.width / 2);
                const offsetY = event.clientY - (rect.top + rect.height / 2);

                x.set((offsetX / rect.width) * strength * 2);
                y.set((offsetY / rect.height) * strength * 2);
            },
            onMouseLeave: () => {
                x.set(0);
                y.set(0);
            }
        }),
        [springX, springY, strength, x, y]
    );

    return api;
}
