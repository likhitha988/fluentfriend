import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to Vite (same origin) and Vite forwards /api to the Express server,
// so cookies are first-party and no CORS setup is needed locally.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false },
    },
  },
});
