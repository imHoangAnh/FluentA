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
    baseURL: process.env.E2E_BASE_URL ?? 'https://localhost:4173',
    ignoreHTTPSErrors: true,
  },
})
