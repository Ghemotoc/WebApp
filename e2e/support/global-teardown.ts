/**
 * Runs once after the whole e2e suite: puts back seed state the tests change, so tests that run
 * afterwards on the same local database start where the seed left them (TOOL-1, CTO, 24 Oct 2026).
 *
 * Why: many specs save a persona's interface language to match the view they check (the account's
 * language wins over the browser's, S1-E1-04) and restore it in their own afterAll. A spec that
 * forgets, or a run stopped part-way, left accounts on English, and the database test
 * supabase/tests/database/014-profile-locale.test.sql ("every account starts with Romanian")
 * then failed when it ran after e2e without a reset. Each spec still restores its own changes;
 * this is the safety net for the whole run.
 * Who calls it: Playwright, through `globalTeardown` in playwright.config.ts, after every run,
 * whether tests passed or failed.
 * What it calls: runSql (e2e/support/database.ts) against the local database only.
 */
import { runSql } from './database';

/**
 * Puts every seed persona's interface language back to Romanian, the seed's value (decided
 * 17 Oct 2026, 11:48: the interface opens in Romanian for everyone).
 *
 * @returns nothing; throws if the local database can't be reached
 */
export default function globalTeardown(): void {
  // Only the seed personas (supabase/seed.sql gives them @personas.test addresses); accounts a
  // test creates are removed by that test.
  runSql(`update public.profiles set locale = 'ro'
    where locale <> 'ro'
      and id in (select id from auth.users where email like '%@personas.test');`);
}
