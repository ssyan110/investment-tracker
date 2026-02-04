import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all network interfaces for cross-device access
    host: '0.0.0.0',
    port: 5173,
    strictPort: false, // Use different port if 5173 is taken
  }
})