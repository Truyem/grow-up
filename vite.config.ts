import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
    // Load env file based on mode
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './'),
            },
        },
        server: {
            port: 3000,
            open: true,
        },
        build: {
            outDir: 'dist',
            modulePreload: false,
            // Optimize chunk splitting for better caching
            rollupOptions: {
                output: {
                    manualChunks: {
                        // Core React runtime - rarely changes
                        'react-vendor': ['react', 'react-dom'],
                        // Heavy charting library - lazy loaded
                        'recharts': ['recharts'],
                        // Supabase client
                        'supabase': ['@supabase/supabase-js'],
                    },
                },
            },
            // Minification settings
            minify: 'esbuild',
            // Generate source maps for debugging (optional, can remove in prod)
            sourcemap: false,
            // Split CSS into chunks
            cssCodeSplit: true,
            // Reduce chunk size warnings threshold
            chunkSizeWarningLimit: 500,
        },
    };
});
