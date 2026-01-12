import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  use: {
    baseURL: 'http://localhost:5173', // Vite default port is 5173
    headless: false,                  // true in CI
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,                        // change if your app uses another port
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
