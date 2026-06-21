import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api requests to the Laravel backend.
      // Laravel runs on http://127.0.0.1:8000 via `php artisan serve`.
      '/api': {
        target: 'https://kanban-backend-4hhx.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
