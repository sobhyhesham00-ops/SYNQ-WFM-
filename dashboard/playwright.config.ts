import { defineConfig, devices } from '@playwright/test';

// The dashboard talks to the backend over HTTP + WS, but these e2e tests stub
// the network at the browser (page.route) so they run with no backend or DB —
// fast and deterministic in CI. They exercise the real built bundle, so the
// `build` step (tsc + vite) doubles as the typecheck gate.
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Local runs can point at a pre-installed Chromium via PW_CHROMIUM to
        // skip a browser download; CI installs its own matching build.
        launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
