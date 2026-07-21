import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: /habit-(grid|details)\.spec\.js/,
  timeout: 90_000,
  projects: [
    {
      name: 'Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'Edge',
      use: { ...devices['Desktop Chrome'], channel: 'msedge' },
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
})
