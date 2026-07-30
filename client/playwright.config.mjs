import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  use: {
    actionTimeout: 5000,
    navigationTimeout: 15000,
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
});
