/**
 * Writers to follow and the parent's separate yes, in a real browser (stories S1-E5-11 and
 * S1-E2-03b, bundle LOOK-4c).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a visitor sees "Writers to follow this week" on Discover with a new adult writer's card and a
 *   Follow link (board Discover, shelf 3), and never a 14-year-old whose parent hasn't said yes;
 * - the writer turns "Suggest me and my stories to other people" off in Settings › Privacy and
 *   leaves the shelf at once;
 * - a parent opens the one-question page signed out, says yes, sees it confirmed, and can take it
 *   back from the same page (GDPR art. 7(3));
 * - the one-question page passes axe at 390 px, in Romanian and English.
 * Test data: one story of the spec's own for adult_writer and one for kid_14_ok, both with a
 * chapter out two days ago, and a known link on kid_14_ok's agreed consent; all put back after.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The link token this file puts on kid_14_ok's agreed consent. */
const spotlightToken = 'e2e-spotlight-abcdefghijklmnopqrstuvw';

/** Removes the spec's stories and puts the switches and the consent back as the seed has them. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'wtfe2e%';
    delete from public.stories where slug like 'writers-e2e-%';
    update public.profiles set suggest_me = null, locale = 'ro'
      where handle in ('adult_writer', 'kid_14_ok');
    update public.parental_consents set spotlight_agreed_at = null, spotlight_withdrawn_at = null,
      spotlight_token_hash = null, spotlight_requested_at = null, language = 'ro'
      where user_id = '00000000-0000-4000-8000-000000000003';
    delete from public.notifications where kind in ('spotlight_consent_agreed', 'spotlight_consent_withdrawn');`);
}

/**
 * One new story each for adult_writer and kid_14_ok, kid_14_ok's switch on, and the parent's
 * language set to English, so the parent's page opens in English whatever ran before; the
 * consent secret is stored too, so this spec also runs on its own.
 */
function seedWriters() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      rating, first_published_at, last_chapter_published_at)
    values
      ('00000000-0000-4000-8000-000000000001', 'writers-e2e-adult', 'Harta din pod',
       'O hartă găsită în pod.', 'ro', (select id from public.categories where slug = 'fiction'),
       'all_ages', now() - interval '2 days', now() - interval '2 days'),
      ('00000000-0000-4000-8000-000000000003', 'writers-e2e-kid', 'Bicicleta albastră',
       'O bicicletă veche.', 'ro', (select id from public.categories where slug = 'fiction'),
       'all_ages', now() - interval '2 days', now() - interval '2 days');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
      status, published_title, published_body, published_word_count, first_published_at)
    select stories.id, stories.user_id, 'wtfe2e' || lpad(row_number() over (order by slug)::text, 2, '0'), 1,
      'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '2 days'
    from public.stories where slug like 'writers-e2e-%';
    update public.profiles set suggest_me = true where handle = 'kid_14_ok';
    -- The secret the server signs the parent's answer with, as parent-consent.spec.ts stores it.
    select vault.create_secret('local-e2e-consent-secret', 'parental_consent_secret')
      where not exists (select 1 from vault.secrets where name = 'parental_consent_secret');
    update public.parental_consents
      set spotlight_token_hash = encode(extensions.digest('${spotlightToken}', 'sha256'), 'hex'),
        language = 'en'
      where user_id = '00000000-0000-4000-8000-000000000003';`);
}

/**
 * Opens an address in English, as a persona or signed out.
 *
 * @returns the page
 */
async function openAs(browser: Browser, persona: SignInPersonaName | null, address: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Writers to follow and the parent’s separate yes (S1-E5-11, S1-E2-03b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedWriters);
  test.afterAll(cleanUp);

  test('a visitor sees a new writer to follow, never a 14-year-old without the parent’s yes', async ({
    browser,
  }) => {
    const page = await openAs(browser, null, '/discover');
    await expect(page.getByRole('heading', { name: 'Writers to follow this week' })).toBeVisible();
    const card = page.getByRole('article', { name: 'Lia Scrie' });
    await expect(card).toBeVisible();
    await expect(card.getByRole('link', { name: 'Harta din pod' })).toBeVisible();
    // Signed out, Follow is a link to log in.
    await expect(card.getByRole('link', { name: 'Log in to follow' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'kid_14_ok' })).toHaveCount(0);
    await page.context().close();
  });

  test('turning "Suggest me" off takes the writer out at once', async ({ browser }) => {
    const settings = await openAs(browser, 'adult_writer', '/settings#privacy');
    const suggest = settings.getByLabel('Suggest me and my stories to other people');
    await expect(suggest).toBeChecked();
    await suggest.uncheck();
    await expect
      .poll(() =>
        runSql(`select suggest_me from public.profiles where handle = 'adult_writer';`).trim(),
      )
      .toBe('f');
    await settings.context().close();
    const visitor = await openAs(browser, null, '/discover');
    await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(visitor.getByRole('article', { name: 'Lia Scrie' })).toHaveCount(0);
    await visitor.context().close();
  });

  test('a parent says yes on the one-question page, then takes it back', async ({ browser }) => {
    const page = await openAs(browser, null, `/parent-consent/spotlight#${spotlightToken}`);
    await expect(
      page.getByRole('heading', { name: 'May we suggest your child to other readers?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Yes, you may suggest them' }).click();
    await expect(
      page.getByText('You said yes, so readers may see @kid_14_ok among our suggestions.'),
    ).toBeVisible();
    expect(
      runSql(`select count(*) from public.notifications
        where user_id = '00000000-0000-4000-8000-000000000003' and kind = 'spotlight_consent_agreed';`).trim(),
    ).toBe('1');
    await page.getByRole('button', { name: 'Stop suggesting them' }).click();
    await expect(page.getByRole('button', { name: 'Yes, you may suggest them' })).toBeVisible();
    await page.context().close();
  });

  for (const language of ['ro', 'en'] as const) {
    test(`axe: the parent’s suggestions page at 390 px, light, ${language}`, async ({ page }) => {
      await checkScreen(page, {
        address: `/parent-consent/spotlight#${spotlightToken}`,
        width: 390,
        theme: 'light',
        language,
      });
    });
  }
});
