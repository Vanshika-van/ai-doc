import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Requests to /api/... are forwarded to the backend, so the browser sees ONE origin (no CORS setup).
// In Docker the backend is reachable as http://backend:8000
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, watch: { usePolling: true }, proxy: { '/api': { target, changeOrigin: true } } },
  preview: { proxy: { '/api': { target, changeOrigin: true } } },
})