/**
 * The signed-in reader the ad tests use (bundle G7e: only signed-in readers see ads; Robert's
 * design rules, 7 Nov 2026, "Content rules").
 *
 * Who calls it: e2e/ads.spec.ts, e2e/ad-network.spec.ts, e2e/sponsored-ads.spec.ts and
 * e2e/sponsor-placements.spec.ts. What it calls: signInPersona() and useSessionInBrowser() in
 * personas.ts, and runSql() in database.ts.
 * A signed-in reader's profile language decides the app's language, so this sets the teacher
 * persona's language to the one the test reads in, and puts the old one back when the spec ends.
 * Test data: the teacher seed persona only (a reader who isn't the seed story's writer).
 */
import type { BrowserContext } from '@playwright/test';

import { runSql } from './database';
import { signInPersona, useSessionInBrowser } from './personas';

/** The persona the ad tests sign in as. */
const adReader = 'teacher';

/**
 * Remembers the reader's language, to put back once the spec is done.
 *
 * @returns a function that puts the language back
 */
export function rememberAdReaderLanguage(): () => void {
  const locale = runSql(
    `select coalesce(locale, '') from public.profiles where handle = '${adReader}';`,
  ).trim();
  const restored = locale === '' ? 'null' : `'${locale}'`;
  return () => {
    runSql(`update public.profiles set locale = ${restored} where handle = '${adReader}';`);
  };
}

/**
 * Signs the ad reader in for one browser context, reading in the given language.
 *
 * @param context - the browser context the page lives in
 * @param language - the language the page should show
 */
export async function signInAdReader(
  context: BrowserContext,
  language: 'en' | 'ro' = 'en',
): Promise<void> {
  runSql(`update public.profiles set locale = '${language}' where handle = '${adReader}';`);
  await useSessionInBrowser(context, (await signInPersona(adReader)).session);
}
