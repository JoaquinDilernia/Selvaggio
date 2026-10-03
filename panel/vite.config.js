import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tmpdir } from 'os';
import { join } from 'path';

export default defineConfig({
  plugins: [react()],
  // Caché fuera de Dropbox: el sync bloquea node_modules/.vite y el
  // pre-bundling falla con EBUSY (mismo arreglo que la landing).
  cacheDir: join(tmpdir(), 'vite-cache-selvaggio-panel'),
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: () => 'index',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
