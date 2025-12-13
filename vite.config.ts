import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // API keys are now managed server-side via Netlify environment variables
    // No need to inject them into the frontend bundle
  };
});