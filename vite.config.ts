import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This allows the app to access process.env.API_KEY in the code
      // It replaces the variable with the actual value during the build process
      // We use || '' to prevent crashes if the variable is undefined
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});