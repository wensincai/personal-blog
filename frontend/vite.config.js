import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8888,
    proxy: {
      '/api': {
        target: 'http://localhost:8889',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8889',
        changeOrigin: true,
      },
      '/settings': {
        target: 'http://localhost:8889',
        changeOrigin: true,
      }
    }
  }
})
