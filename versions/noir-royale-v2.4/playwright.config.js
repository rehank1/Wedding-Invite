import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  workers: 2,
  retries: 1, // the dev PC occasionally crashes a renderer under parallel load; real failures still fail twice
  reporter: [['list'], ['json', { outputFile: 'reports/playwright-results.json' }], ['html', { outputFolder: 'reports/playwright-html', open: 'never' }]],
  use: { baseURL: `http://localhost:${PORT}/`, trace: 'retain-on-failure' },
  webServer: { command: `node scripts/build.mjs && node scripts/serve.mjs dist ${PORT}`, port: PORT, reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /(compat|cine|perf)[.]spec/ },
    // frame-rate checks (intro + scrolling) run on their own: npm test runs it after the rest with one worker
    { name: 'intro', use: { ...devices['Desktop Chrome'] }, testMatch: /(cine|perf)[.]spec/ },
    // Firefox's downloaded binary is blocked from launching on the dev PC (spawn UNKNOWN); it runs in CI.
    ...(process.env.CI || process.env.PW_FIREFOX ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /compat.spec/ }] : []),
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] }, testMatch: /compat.spec/ },
    ...(process.env.CI ? [] : [{ name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' }, testMatch: /compat.spec/ }]),
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'] }, testMatch: /compat\.spec/ },
    { name: 'chromium-android', use: { ...devices['Pixel 7'] }, testMatch: /compat\.spec/ },
  ],
});
