export const cinematicEase = [0.76, 0, 0.24, 1];

export const springs = {
    soft: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 },
    snap: { type: 'spring', stiffness: 400, damping: 30, mass: 0.6 },
    float: { type: 'spring', stiffness: 170, damping: 22, mass: 1 }
};

export const pageVariants = {
    initial: {
        opacity: 0,
        scale: 0.985,
        clipPath: 'inset(0 100% 0 0 round 0px)'
    },
    animate: {
        opacity: 1,
        scale: 1,
        clipPath: 'inset(0 0% 0 0 round 0px)'
    },
    exit: {
        opacity: 0,
        scale: 0.96,
        clipPath: 'inset(0 0% 0 0 round 0px)'
    }
};

export const pageTransition = {
    duration: 0.6,
    ease: cinematicEase
};

export const contentStagger = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.12
        }
    }
};

export const contentRise = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0 }
};

export function postCardInView(index = 0) {
    return {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-12% 0px -8% 0px' },
        transition: {
            duration: 0.55,
            delay: index * 0.07,
            ease: cinematicEase
        }
    };
}

export const drawerVariants = {
    closed: { x: '100%', opacity: 0 },
    open: {
        x: 0,
        opacity: 1,
        transition: {
            duration: 0.5,
            ease: cinematicEase,
            staggerChildren: 0.05,
            delayChildren: 0.08
        }
    }
};

export const drawerItemVariants = {
    closed: { x: 100, opacity: 0 },
    open: { x: 0, opacity: 1, transition: { duration: 0.42, ease: cinematicEase } }
};
