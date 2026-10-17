/**
 * End-to-end test settings (story S1-E1-01).
 *
 * Who reads it: `npm run test:e2e`, on your computer and in CI (the "e2e" job).
 * What it does: builds the app, serves the built `dist` folder (the same files Cloudflare Pages
 * publishes, built the way staging is, with the /design page) and drives Chromium through the
 * tests in e2e/, with axe checking accessibility.
 * In a Claude Code cloud session Chromium is pre-installed; PLAYWRIGHT_CHROMIUM_PATH points to it.
 */
import { defineConfig, devices } from '@playwright/test';

/** The address `vite preview` serves the built app on. */
const previewUrl = 'http://127.0.0.1:4173';

/** A pre-installed Chromium to use instead of Playwright's own download, when one is given. */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: './e2e',
  // CI stops a pull request if someone left `test.only` in a file.
  forbidOnly: process.env.CI !== undefined,
  // One retry in CI, so a slow runner is told apart from a real failure in the report.
  retries: process.env.CI === undefined ? 0 : 1,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: previewUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumPath === undefined ? {} : { executablePath: chromiumPath },
      },
    },
  ],
  // Build and serve the app before the tests start.
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: previewUrl,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 180_000,
    // Build as staging does: with the /design components page included (S1-E1-03).
    env: { VITE_SHOW_DESIGN_PAGE: 'true' },
  },
});
