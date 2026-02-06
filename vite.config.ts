import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
    // Load env file based on mode
    const env = loadEnv(mode, process.cwd(), '');

    // Collect all API keys from environment variables
    const apiKeys: string[] = [];

    // Support numbered API keys: API_KEY_1, API_KEY_2, etc.
    for (let i = 1; i <= 20; i++) {
        const key = env[`API_KEY_${i}`];
        if (key) {
            apiKeys.push(key);
        }
    }

    // Fallback to single API_KEY or GEMINI_API_KEY if no numbered keys found
    if (apiKeys.length === 0) {
        if (env.API_KEY) {
            apiKeys.push(env.API_KEY);
        } else if (env.GEMINI_API_KEY) {
            apiKeys.push(env.GEMINI_API_KEY);
        }
    }

    console.log(`🔑 Loaded ${apiKeys.length} API key(s)`);

    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './'),
            },
        },
        define: {
            // Inject API keys into the application
            'process.env.API_KEYS': JSON.stringify(apiKeys),
        },
        server: {
            port: 3000,
            open: true,
            proxy: {
                '/google-api': {
                    target: 'https://generativelanguage.googleapis.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/google-api/, ''),
                },
            },
        },
        build: {
            outDir: 'dist',
        },
    };
});
