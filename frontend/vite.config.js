import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },
  define: {
    // Production'da backend URL'ini kullan
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || '')
  }
})

