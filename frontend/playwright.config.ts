import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/test_styling.ts',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    headless: false,
    baseURL: 'http://localhost:3001',
    viewport: { width: 1920, height: 1080 },
  },
  webServer: undefined,
});
