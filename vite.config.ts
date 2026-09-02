import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    css: false,
    // E2E (Playwright) mora em e2e/ e roda separado (npm run test:e2e) —
    // não tem sentido o Vitest tentar coletar os mesmos arquivos.
    exclude: ['node_modules/**', 'e2e/**', 'dist/**'],
  },
})
