import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // The client and API are local; do not expose development assets to arbitrary sites.
    cors: false,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
