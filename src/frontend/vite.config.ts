import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [basicSsl(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
