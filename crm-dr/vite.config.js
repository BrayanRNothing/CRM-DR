import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
// Build: Dec 9, 2025
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})