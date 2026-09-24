import { defineConfig, devices } from '@playwright/test'

const basePath = process.env.WP_AUTH_BASE_PATH || '/'
export default defineConfig({
  testDir: './tests/auth',
  workers: 1,
  reporter: 'list',
  globalSetup: './tests/auth/setup.ts',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: `http://127.0.0.1:5183${basePath}`,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
