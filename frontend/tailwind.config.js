/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                ink: 'var(--color-ink)',
                'ink-soft': 'var(--color-ink-soft)',
                paper: 'var(--color-paper)',
                'paper-mid': 'var(--color-paper-mid)',
                volt: 'var(--volt)',
                'volt-dim': 'var(--volt-dim)',
                mist: 'var(--color-mist)',
                ember: 'var(--ember)',
                void: 'var(--void)'
            },
            fontFamily: {
                display: ['Bebas Neue', 'Impact', 'sans-serif'],
                body: ['Crimson Pro', 'Georgia', 'serif'],
                ui: ['DM Mono', 'Menlo', 'monospace']
            },
            boxShadow: {
                editorial: '0 18px 48px rgba(10, 10, 15, 0.12)',
                'editorial-dark': '0 24px 70px rgba(4, 4, 12, 0.55)'
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                },
                'volt-pulse': {
                    '0%': { boxShadow: '0 0 0 0 rgba(200, 241, 53, 0.55)' },
                    '100%': { boxShadow: '0 0 0 16px rgba(200, 241, 53, 0)' }
                }
            },
            animation: {
                shimmer: 'shimmer 1.8s linear infinite',
                'volt-pulse': 'volt-pulse 0.6s ease-out'
            }
        }
    },
    plugins: []
};
