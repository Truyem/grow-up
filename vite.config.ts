import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig(({ mode }) => {
    // ... rest of the logic remains the same
    const env = loadEnv(mode, process.cwd(), '');
    const apiKeys: string[] = [];

    for (let i = 1; i <= 20; i++) {
        const key = env[`API_KEY_${i}`];
        if (key) {
            apiKeys.push(key);
        }
    }

    if (apiKeys.length === 0) {
        if (env.API_KEY) {
            apiKeys.push(env.API_KEY);
        } else if (env.GEMINI_API_KEY) {
            apiKeys.push(env.GEMINI_API_KEY);
        }
    }

    console.log(`🔑 Loaded ${apiKeys.length} API key(s)`);

    return {
        plugins: [
            react(),
            tailwindcss(),
            viteSingleFile(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './'),
            },
        },
        define: {
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
