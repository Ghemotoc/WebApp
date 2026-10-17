/**
 * End-to-end test settings (story S1-E1-01).
 *
 * Who reads it: `npm run test:e2e`, on your computer and in CI (the "e2e" job).
 * What it does: builds the app, serves the built `dist` folder (the same files Cloudflare Pages
 * publishes, built the way staging is, with the /design page) and drives Chromium through the
 * tests in e2e/, with axe checking accessibility.
 * In a Claude Code cloud session Chromium is pre-installed; PLAYWRIGHT_CHROMIUM_PATH points to it.
 * Signed-in tests (S1-E1-04) need the local Supabase: start it with `npx supabase start`. This file
 * finds its address and public anon key (from the environment, or by asking the Supabase CLI) and
 * builds the app with them, so the app and the tests talk to the same local database.
 */
import { execFileSync } from 'node:child_process';

import { defineConfig, devices } from '@playwright/test';

/** The address `vite preview` serves the built app on. */
const previewUrl = 'http://127.0.0.1:4173';

/** A pre-installed Chromium to use instead of Playwright's own download, when one is given. */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

/**
 * Finds the local Supabase's address and public anon key. Values already in the environment win
 * (CI sets them); otherwise the Supabase CLI is asked. Only public values are used: the anon key,
 * never the service role key (CLAUDE.md rule 2).
 *
 * @returns both values, or empty strings when Supabase isn't running (signed-in tests then fail
 *   with a message saying how to start it; e2e/support/personas.ts)
 */
function findLocalSupabase(): { url: string; anonKey: string } {
  // Step 1: CI (or you) may have set them already.
  const urlFromEnvironment = process.env.VITE_SUPABASE_URL ?? '';
  const keyFromEnvironment = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (urlFromEnvironment !== '' && keyFromEnvironment !== '') {
    return { url: urlFromEnvironment, anonKey: keyFromEnvironment };
  }

  // Step 2: ask the CLI. Its output is read here and never printed.
  try {
    const statusJson = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 30_000,
    });
    const status = JSON.parse(statusJson) as { API_URL?: string; ANON_KEY?: string };
    return { url: status.API_URL ?? '', anonKey: status.ANON_KEY ?? '' };
  } catch {
    return { url: '', anonKey: '' };
  }
}

// Shared with the test files (the workers read the same environment) and the app build below.
const localSupabase = findLocalSupabase();
process.env.VITE_SUPABASE_URL = localSupabase.url;
process.env.VITE_SUPABASE_ANON_KEY = localSupabase.anonKey;

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
    // Build as staging does: with the /design components page included (S1-E1-03), pointing at
    // the local Supabase so signed-in tests work (S1-E1-04).
    env: {
      VITE_SHOW_DESIGN_PAGE: 'true',
      VITE_SUPABASE_URL: localSupabase.url,
      VITE_SUPABASE_ANON_KEY: localSupabase.anonKey,
    },
  },
});
