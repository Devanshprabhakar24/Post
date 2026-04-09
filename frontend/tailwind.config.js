/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                surface: {
                    950: '#060b14',
                    900: '#0a1322',
                    800: '#121f34'
                },
                accent: {
                    400: '#22d3ee',
                    500: '#06b6d4'
                }
            },
            boxShadow: {
                glow: '0 20px 40px rgba(6, 182, 212, 0.18)'
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                }
            },
            animation: {
                shimmer: 'shimmer 1.8s linear infinite'
            }
        }
    },
    plugins: []
};
