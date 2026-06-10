import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: /spec-performance\.spec\.js/,
  timeout: 120_000,
  projects: [
    {
      name: 'Chromium Performance',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
})
