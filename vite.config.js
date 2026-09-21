import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tmpdir } from 'os'
import { join } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Cache fuera de la carpeta del proyecto: al vivir en Dropbox, el
  // resync en tiempo real bloquea archivos de node_modules/.vite y
  // rompe el pre-bundling de dependencias (EBUSY) en desarrollo.
  cacheDir: join(tmpdir(), 'vite-cache-selvaggio'),

  // Optimización de build
  build: {
    // Code splitting para mejor performance
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/firestore'],
        }
      }
    },
    // Optimizar assets
    assetsInlineLimit: 4096, // 4kb
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remover console.logs en producción
        drop_debugger: true
      }
    }
  },
  
  // Optimización de servidor de desarrollo
  server: {
    port: 3000,
    open: true
  },
  
  // Preview server
  preview: {
    port: 4173,
    open: true
  }
})
