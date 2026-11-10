/**
 * Writer of the week in a real browser (bundle GAPS-12e; board WritersHub, "Writer of the week ·
 * staff pick").
 *
 * What it proves:
 * - an admin invites a writer at /staff/hub and sees the pick waiting for the writer's answer;
 * - nothing shows to another member until the writer agrees on their own hub; once agreed, the
 *   member sees the writer's name as a link to the profile, staff's line and Follow;
 * - the writer takes the card down again and it goes for everyone;
 * - the hub and the staff page have no serious axe issue at phone and desktop width.
 * The database rules (who may invite, adults only, the 7 days, blocks) are in
 * supabase/tests/database/336-writer-spotlights.test.sql.
 * Test data: the seed's admin, adult_writer and teacher, who read in Romanian; the pick is
 * removed afterwards (the audit log keeps its rows: append-only).
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const reason = {
  en: 'Her radio stories kept us reading (e2e)',
  ro: 'Poveștile ei ne-au ținut treji (e2e)',
};

/** Removes the picks this spec made. */
function cleanUp() {
  runSql(`delete from public.writer_spotlights where reason_en like '%(e2e)';`);
}

/** Opens a page as a seed persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string) {
  // Other specs leave a persona reading in English; this one checks the Romanian words, so it
  // sets the language itself instead of counting on what ran before it.
  runSql(`update public.profiles set locale = 'ro' where handle = '${persona}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('writer of the week (GAPS-12e)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('an admin invites a writer and the pick waits for their answer', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/hub');
    await page.setViewportSize({ width: 1440, height: 900 });
    const section = page.getByRole('region', { name: 'Scriitorul săptămânii' });
    await section.getByRole('button', { name: 'Invită un scriitor' }).click();
    await section.getByLabel('Nume de utilizator').fill('@adult_writer');
    await section.getByLabel('De ce, în engleză').fill(reason.en);
    // Without the day and the Romanian line the invitation can't be sent.
    await expect(section.getByRole('button', { name: 'Trimite invitația' })).toBeDisabled();
    await section.getByLabel('De ce, în română').fill(reason.ro);
    await section.getByLabel('Prima zi').fill(runSql(`select public.romania_today();`).trim());
    await section.getByRole('button', { name: 'Trimite invitația' }).click();
    const list = section.getByRole('list', {
      name: 'Alegeri pentru scriitorul săptămânii, de la cea mai nouă',
    });
    await expect(list.getByText('@adult_writer')).toBeVisible();
    await expect(list.getByText('Se așteaptă răspunsul scriitorului')).toBeVisible();
    await page.context().close();
  });

  test('another member sees nothing before the writer agrees', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/hub');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Scriitorul săptămânii' })).toHaveCount(0);
    await expect(page.getByText(reason.ro)).toHaveCount(0);
    await page.context().close();
  });

  test('the writer agrees on their own hub', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/hub');
    await page.setViewportSize({ width: 390, height: 900 });
    const invitation = page.getByRole('region', { name: 'Invitație' });
    await expect(invitation.getByText(reason.ro)).toBeVisible();
    await expect(invitation.getByText('Nimic nu apare până nu accepți.')).toBeVisible();
    await invitation.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(
      invitation.getByText('Ai acceptat. Membrii văd cardul în zilele acelea.'),
    ).toBeVisible();
    // The writer's own hub shows the card too, without Follow.
    const ownCard = page.getByRole('region', { name: 'Scriitorul săptămânii' });
    await expect(ownCard.getByRole('link', { name: 'Lia Scrie' })).toBeVisible();
    // Nobody follows themselves.
    await expect(ownCard.getByRole('button', { name: /Urmărește|Urmărești/ })).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
  });

  test('a member then sees the writer, the line and Follow', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/hub');
    const card = page.getByRole('region', { name: 'Scriitorul săptămânii' });
    await expect(card.getByRole('link', { name: 'Lia Scrie' })).toHaveAttribute(
      'href',
      '/u/adult_writer',
    );
    await expect(card.getByText(reason.ro)).toBeVisible();
    await expect(card.getByText('Alegerea echipei')).toBeVisible();
    await expect(card.getByRole('button', { name: /Urmărește|Urmărești/ })).toBeVisible();
    await page.context().close();
  });

  for (const view of [
    { persona: 'adult_writer', address: '/hub', width: 390, theme: 'night' },
    { persona: 'teacher', address: '/hub', width: 1440, theme: 'light' },
    { persona: 'admin', address: '/staff/hub', width: 390, theme: 'night' },
    { persona: 'admin', address: '/staff/hub', width: 1440, theme: 'light' },
  ] as const) {
    test(`no serious axe issue on ${view.address} at ${view.width} px, ${view.theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona(view.persona)).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, language: 'ro' });
      await context.close();
    });
  }

  test('the writer takes the card down and it goes for everyone', async ({ browser }) => {
    const writerPage = await openAs(browser, 'adult_writer', '/hub');
    const invitation = writerPage.getByRole('region', { name: 'Invitație' });
    await invitation.getByRole('button', { name: 'Scoate cardul' }).click();
    await expect(invitation.getByText('Ai refuzat. Nimic nu apare.')).toBeVisible();
    await expect(writerPage.getByRole('region', { name: 'Scriitorul săptămânii' })).toHaveCount(0);
    await writerPage.context().close();
    const memberPage = await openAs(browser, 'teacher', '/hub');
    await expect(memberPage.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(memberPage.getByRole('region', { name: 'Scriitorul săptămânii' })).toHaveCount(0);
    await memberPage.context().close();
  });
});
