import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tmpdir } from 'os';
import { join } from 'path';

export default defineConfig({
  plugins: [react()],
  // Caché fuera de Dropbox (el sync bloquea node_modules/.vite → EBUSY).
  cacheDir: join(tmpdir(), 'vite-cache-selvaggio-web-v2'),
  server: { port: 5174 },
});
