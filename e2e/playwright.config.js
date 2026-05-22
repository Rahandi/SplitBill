import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: 'tests/api.spec.js',
    },
    {
      name: 'ui',
      testMatch: 'tests/ui.spec.js',
      use: { browserName: 'chromium' },
    },
  ],
})
