import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // All /api/* calls in dev are forwarded to the Express server
      '/api': 'http://localhost:3001',
    },
  },
});
