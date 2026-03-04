import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/school-digital-twin/',  // ← must match your GitHub repo name exactly
})