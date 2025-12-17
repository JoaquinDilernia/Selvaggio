import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
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
