import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In development PocketBase runs on :8097 (see justfile); Vite proxies its API and dashboard.
// In production PocketBase serves the built SPA from pb_public, same origin.
const PB = process.env.CATALOG_PB_URL ?? 'http://127.0.0.1:8097'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5177,
    strictPort: true,
    proxy: { '/api': PB, '/_': PB },
  },
  test: { environment: 'node' },
})
