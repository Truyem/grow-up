import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
    // Load env file based on mode
    const env = loadEnv(mode, process.cwd(), '');

    // Collect all Gemini API keys from environment variables
    const geminiApiKeys: string[] = [];

    // Support numbered API keys: API_KEY_1, API_KEY_2, etc.
    for (let i = 1; i <= 20; i++) {
        const key = env[`API_KEY_${i}`];
        if (key) {
            geminiApiKeys.push(key);
        }
    }

    // Fallback to single API_KEY if no numbered keys found
    if (geminiApiKeys.length === 0) {
        if (env.API_KEY) {
            geminiApiKeys.push(env.API_KEY);
        }
    }

    console.log(`🔑 Loaded ${geminiApiKeys.length} Gemini API key(s) for food image analysis`);

    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './'),
            },
        },
        define: {
            // Inject Gemini API keys into the application
            'process.env.GEMINI_API_KEYS': JSON.stringify(geminiApiKeys),
        },
        server: {
            port: 3000,
            open: true,
        },
        build: {
            outDir: 'dist',
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
