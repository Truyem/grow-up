import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  // Collect all API keys (API_KEY_1, API_KEY_2, etc.)
  const apiKeys: string[] = [];
  let i = 1;
  while (env[`API_KEY_${i}`]) {
    apiKeys.push(env[`API_KEY_${i}`]);
    i++;
  }
  // Fallback to single API_KEY if no numbered keys found
  if (apiKeys.length === 0 && env.API_KEY) {
    apiKeys.push(env.API_KEY);
  }

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEYS': JSON.stringify(apiKeys)
    }
  };
});