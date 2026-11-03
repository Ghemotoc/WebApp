/**
 * Who may review pictures, and the alert when staff open one, in a real browser (bundle ADMIN-2,
 * part e2a; Robert's brief of 2 Nov 2026, section 5).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - on Staff › Roles an admin marks a staff member as an intern, and picture review is then
 *   refused for them with a plain reason;
 * - a moderator without picture review is told Pictures to check isn't open to them;
 * - when a picture reviewer opens Pictures to check, the owner sees it on the staff home page and
 *   gets an alert, and the audit log has the opening;
 * - the staff home page with the panel passes axe at 390, 768 and 1440 px.
 * Test data: seed personas; the support persona's extra moderator role, intern marker, the waiting
 * picture, its case and the alerts are removed afterwards (audit log rows stay: it is append-only).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The support persona and adult_writer's seed story (supabase/seed.sql). */
const supportId = '00000000-0000-4000-8000-000000000011';
const writerId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
/** The waiting picture this spec makes (its file isn't uploaded: the card says so). */
const pictureId = 'e2e12e2a-0000-4000-8000-000000000001';

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Removes everything this spec made and puts the languages back. */
function cleanUp() {
  runSql(`
    delete from public.staff_interns where user_id = '${supportId}';
    delete from public.staff_permissions where user_id = '${supportId}' and permission = 'picture_review';
    delete from public.staff_roles where user_id = '${supportId}' and role = 'moderator';
    delete from public.notifications where kind = 'picture_opened_by_staff';
    with removed as (delete from public.picture_checks where id = '${pictureId}' returning case_id)
    delete from public.cases where id in (select case_id from removed);
    update public.profiles set locale = 'ro' where handle in ('admin', 'owner', 'moderator', 'support');`);
}

/** A picture by adult_writer in their All ages story, waiting for a moderator with its case. */
function seedWaitingPicture() {
  runSql(`
    insert into public.picture_checks (id, user_id, bucket, path, kind, story_id, status)
    values ('${pictureId}', '${writerId}', 'covers', '${storyId}/e2e-e2a.png', 'cover', '${storyId}', 'held');
    update public.picture_checks set case_id = public.open_picture_review_case(picture_checks)
    where id = '${pictureId}';`);
}

test.describe('picture reviewers and the opening alert (ADMIN-2e2a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedWaitingPicture();
  });
  test.afterAll(cleanUp);

  test('an admin marks an intern, and picture review is refused for them', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/roles');
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: '@support' }) });
    await card.getByLabel('Reason for this change').fill('Summer intern');
    // The boxes follow the database, so they are clicked and then read back once it has saved.
    const internBox = card.getByRole('checkbox', { name: 'Intern (never reviews pictures)' });
    await internBox.click();
    await expect(page.getByText('Saved. It’s in the audit log.')).toBeVisible();
    await expect(internBox).toBeChecked();
    await card
      .getByRole('checkbox', { name: 'Picture review (18 or over, never interns)' })
      .click();
    await expect(
      page.getByText('Picture review is only for staff aged 18 or over who aren’t interns.'),
    ).toBeVisible();
    expect(
      runSql(
        `select count(*) from public.staff_permissions where user_id = '${supportId}' and permission = 'picture_review'`,
      ),
    ).toBe('0');
    await page.context().close();
  });

  test('a moderator without picture review is told the page isn’t for them', async ({
    browser,
  }) => {
    runSql(`insert into public.staff_roles (user_id, role) values ('${supportId}', 'moderator');`);
    const page = await openAs(browser, 'support', '/staff/pictures');
    await expect(
      page.getByText('Only staff with the picture review permission can check pictures.'),
    ).toBeVisible();
    await page.context().close();
  });

  test('a reviewer opening Pictures to check alerts the owner on the staff home page', async ({
    browser,
  }) => {
    const moderatorPage = await openAs(browser, 'moderator', '/staff/pictures');
    await expect(moderatorPage.getByRole('heading', { name: /@adult_writer/ })).toBeVisible();
    await expect(
      moderatorPage.getByText('Opening a picture here is in the audit log, and the owner is told.'),
    ).toBeVisible();
    await moderatorPage.context().close();
    expect(
      runSql(
        `select count(*) from public.audit_log where action = 'picture.opened' and target_id = '${pictureId}'`,
      ),
    ).toBe('1');

    const ownerPage = await openAs(browser, 'owner', '/staff');
    const panel = ownerPage.getByRole('region', { name: 'Uploaded pictures opened by staff' });
    await expect(panel.getByText('@moderator')).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Open the audit log' })).toBeVisible();
    expect(
      runSql(
        `select count(*) from public.notifications n join public.profiles p on p.id = n.user_id
         where p.handle = 'owner' and n.kind = 'picture_opened_by_staff'`,
      ),
    ).toBe('1');
    await ownerPage.context().close();
  });

  for (const view of everyView(['/staff'])) {
    test(`axe: staff home with the openings panel at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
