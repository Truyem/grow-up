import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Only inject the API_KEY for Gemini. 
      // Discord Tokens are now accessed securely on the server-side (Netlify Function)
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});