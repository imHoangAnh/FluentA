import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const assetStorage = loadEnv(mode, __dirname, 'ASSET_STORAGE_')
  const assetBucket = assetStorage.ASSET_STORAGE_BUCKET ?? 'fluenta-assets-dev'
  const assetProxyTarget = assetStorage.ASSET_STORAGE_PROXY_TARGET ?? 'http://127.0.0.1:9000'

  return {
    plugins: [basicSsl(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        [`/${assetBucket}`]: {
          target: assetProxyTarget,
          changeOrigin: false,
        },
      },
    },
    test: {
      environment: 'jsdom',
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      setupFiles: './src/test/setup.ts',
      globals: true,
    },
  }
})
