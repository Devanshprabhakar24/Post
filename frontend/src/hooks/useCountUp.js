import { useEffect, useState } from 'react';

export default function useCountUp(target, duration = 900) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        const end = Number(target) || 0;
        if (end <= 0) {
            setValue(0);
            return undefined;
        }

        const startTime = performance.now();
        let rafId = 0;

        const tick = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(end * eased));

            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            }
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [duration, target]);

    return value;
}
