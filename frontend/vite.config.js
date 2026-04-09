import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }

                    if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('react-hot-toast')) {
                        return 'vendor-react';
                    }

                    if (id.includes('framer-motion')) {
                        return 'vendor-motion';
                    }

                    if (id.includes('socket.io-client')) {
                        return 'vendor-socket';
                    }

                    return 'vendor-misc';
                }
            }
        }
    },
    server: {
        port: 3000,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://localhost:8000',
                ws: true,
                changeOrigin: true
            }
        }
    }
});
