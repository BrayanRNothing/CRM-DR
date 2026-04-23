import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

const DEFAULT_REMOTE_API = 'https://api.solomycrm.com'
const targetApi = process.env.VITE_API_URL && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(process.env.VITE_API_URL)
  ? process.env.VITE_API_URL
  : DEFAULT_REMOTE_API

// https://vitejs.dev/config/
// Build: Dec 9, 2025
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
  ],
  server: {
    https: true,
    proxy: {
      '/api': {
        target: targetApi,
        changeOrigin: true,
      },
      '/socket.io': {
        target: targetApi,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})