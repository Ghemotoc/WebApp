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
  // After every run, put the seed personas' language back to Romanian, so database tests run
  // afterwards without a reset still find the seed's state (TOOL-1; e2e/support/global-teardown.ts).
  globalTeardown: './e2e/support/global-teardown.ts',
  // CI stops a pull request if someone left `test.only` in a file.
  forbidOnly: process.env.CI !== undefined,
  // One test at a time: the tests share the seed personas in one local database, and some change
  // a persona's saved language, so two at once could see each other's changes (S1-E1-QA).
  // Measured 24 Oct 2026 (TOOL-1): of about 16.5 minutes of tests, only about 3.5 are in files
  // that share no persona, seed story or site-wide flag (maintenance mode, invite-only, legal
  // versions), so 2 workers would save about 1.5 minutes. A real gain needs a test persona and
  // story per worker first.
  workers: 1,
  // One retry in CI, so a slow runner is told apart from a real failure in the report. A test
  // that only passes on its retry is flaky, and a flaky test fails the run instead of passing
  // quietly (QA-3, finding A3): the list reporter names it, and it gets fixed.
  retries: process.env.CI === undefined ? 0 : 1,
  failOnFlakyTests: process.env.CI !== undefined,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: previewUrl,
    // A trace only for a test's retry, so only a test that failed once is recorded. Recording
    // every test ('retain-on-failure') filled the CI runner's disk during a shard: with one worker
    // for 700-odd tests, the traces' resources pile up until the worker ends (ENOSPC, 11 Nov 2026;
    // CI-2). Locally there is no retry, so run a failing test again with --trace on to debug it.
    trace: 'on-first-retry',
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
      // The leaked-password check answers from a fixed list, not the internet (S1-E2-01).
      PASSWORD_CHECK_STUB: '1',
      // The sign-up country token's secret for local tests only (S1-E2-10); e2e/country.spec.ts
      // puts the same value in the local database's Vault. Never a real secret.
      SIGNUP_CONTEXT_SECRET: 'local-e2e-signup-secret',
      // The key that scrambles IP addresses, for local tests only (bundle ADMIN-2, parts e2b and
      // f2); a test sends CF-Connecting-IP itself. Never a real secret.
      IP_SCRAMBLE_SECRET: 'local-e2e-ip-secret',
      // The public report form's signing secret for local tests only (S1-E10-02); e2e/public-notice
      // puts the same value in the local database's Vault. Never a real secret.
      NOTICE_SECRET: 'local-e2e-notice-secret',
      // The picture check's signing secret for local tests only (S1-E10-05); e2e/picture-check
      // puts the same value in the local database's Vault. Never a real secret.
      PICTURE_CHECK_SECRET: 'local-e2e-picture-secret',
      // Support tickets' signing secret for local tests only (S1-E11-13); e2e/support-tickets puts
      // the same value in the local database's Vault. Never a real secret.
      SUPPORT_TICKET_SECRET: 'local-e2e-support-secret',
      // The key in the support inbound webhook's address, for local tests only (ADMIN-2h2). On
      // Cloudflare it is SUPPORT_INBOUND_KEY, set by hand. Never a real secret.
      SUPPORT_INBOUND_KEY: 'local-e2e-inbound-key',
      // The age check's signing secret for local tests only (S1-E2-08); e2e/age-check puts the
      // same value in the local database's Vault. Never a real secret.
      AGE_CHECK_SECRET: 'local-e2e-age-secret',
      // Parental consent's signing secret for local tests only (S1-E2-03); e2e/parent-consent puts
      // the same value in the local database's Vault. Never a real secret.
      PARENTAL_CONSENT_SECRET: 'local-e2e-consent-secret',
      // The Teacher badge link's signing secret for local tests only (S1-E2-11); e2e/teacher-badge
      // puts the same value in the local database's Vault. Never a real secret.
      TEACHER_CHECK_SECRET: 'local-e2e-teacher-secret',
      // The notification email worker's key (S1-E7-02): the same local-only value supabase/seed.sql
      // puts in the Vault as email_worker_key. Never a real secret.
      EMAIL_WORKER_KEY: 'local-only-email-worker-key-not-for-staging',
      VITE_SUPABASE_URL: localSupabase.url,
      VITE_SUPABASE_ANON_KEY: localSupabase.anonKey,
    },
  },
});
