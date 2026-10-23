/**
 * Takes the pull request's screenshots: the addresses in SCREENSHOT_ADDRESSES at 390, 768 and
 * 1440 px, signed in as SCREENSHOT_PERSONA (story S1-E3-01; e2e/support/screenshots.ts).
 *
 * Skipped unless SCREENSHOT_ADDRESSES is set, so CI never runs it.
 */
import { test } from '@playwright/test';

import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';
import { captureAtEveryWidth } from './support/screenshots';

const addresses = (process.env.SCREENSHOT_ADDRESSES ?? '').split(',').filter((a) => a !== '');
const persona = (process.env.SCREENSHOT_PERSONA ?? '') as SignInPersonaName | '';

test.skip(addresses.length === 0, 'Set SCREENSHOT_ADDRESSES to take screenshots.');

test('screenshots for the pull request', async ({ page }) => {
  test.setTimeout(120_000);
  if (persona !== '') {
    // The account's own language wins (S1-E1-04), so the persona reads in English for the shots.
    runSql(
      `update public.profiles set locale = 'en' where id in (select id from auth.users where email = '${persona}@personas.test');`,
    );
    await useSessionInBrowser(page.context(), (await signInPersona(persona)).session);
  }
  for (const address of addresses) {
    await captureAtEveryWidth(page, address);
  }
  if (persona !== '') {
    runSql(
      `update public.profiles set locale = 'ro' where id in (select id from auth.users where email = '${persona}@personas.test');`,
    );
  }
});
