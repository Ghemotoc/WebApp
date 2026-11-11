/**
 * Writing certificates, in a real browser (bundle CLASSES, part e; story S1-E8-12).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the teacher opens Certificates from the class's settings, picks a result for a student and
 *   approves the list, which signs it (criteria 1 and 5);
 * - the student finds it under My certificates, types the real name it prints, and sees the
 *   certificate in English and in Romanian, ready to print (criteria 2 and 4);
 * - a visitor checks the code and sees "valid" without the student's name (criterion 6);
 * - staff with Schools access find the code and revoke it; the check page then says "revoked"
 *   (criterion 7);
 * - archiving the class tells the teacher in the app and queues an email (criterion 3);
 * - every certificate screen passes axe at 390, 768 and 1440 px, light and night, ro and en, and
 *   no doodle is drawn.
 * Test data: the teacher persona starts the class with SQL; pending_check joins with its code;
 * the moderator persona has the Schools permission. Everything is removed before and after; the
 * class's name never ends in "e2e", so spaces.spec leaves it alone.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The class this spec makes. */
const className = 'Clasa a VIII-a diplome';
const classSlug = 'clasa-a-viii-a-diplome';
const programme = 'Writing club 2027';
/**
 * A school crest drawn as an SVG with a script in it (G13b): the browser redraws it as a PNG before
 * upload, so the script is never stored and never runs.
 */
const crestSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
    '<script>document.title = "crest script ran"</script>' +
    '<circle cx="32" cy="32" r="28" fill="#0F766E"/></svg>',
);

/** The personas' user IDs, to act as them in SQL. */
const teacherId = '00000000-0000-4000-8000-000000000007';
const studentId = '00000000-0000-4000-8000-000000000005';

/**
 * Runs SQL as one persona, signed in.
 *
 * @param userId - whose session
 * @param statements - what to run
 * @returns the last line psql prints
 */
function runAs(userId: string, statements: string): string {
  const output = runSql(`select set_config('role', 'authenticated', false),
      set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', false);
    ${statements}`);
  return output.trim().split('\n').at(-1) ?? '';
}

/** Removes the class with its certificates, notices and everything in it. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  // Deleting a certificate keeps its code as retired, so the codes are read before the delete.
  runSql(`do $$
    declare gone_codes text[];
    begin
      select array_agg(code) into gone_codes from public.certificates where space_id in ${space};
      delete from public.certificates where space_id in ${space};
      delete from public.retired_certificate_codes where code = any (gone_codes);
    end $$;
    delete from public.picture_checks where kind = 'certificate_crest'
      and split_part(path, '/', 1) in (select id::text from public.spaces where slug = '${classSlug}');
    update public.feature_flags set is_enabled = false where key = 'picture_uploads';
    delete from public.email_outbox where user_id = '${teacherId}';
    delete from public.notifications where kind in ('certificate_issued', 'class_archived')
      and user_id in ('${teacherId}', '${studentId}');
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'pending_check', 'moderator');`);
}

/**
 * The class with the student in it, and picture uploads on for the crest (G13b). The local server
 * signs check results with PICTURE_CHECK_SECRET (playwright.config.ts) and the database checks them
 * against the same value in its Vault, so the spec makes that test value itself instead of relying
 * on another spec having run first. Never a real secret.
 */
function setUp() {
  runSql(`update public.feature_flags set is_enabled = true where key = 'picture_uploads';
    select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret')
    where not exists (select 1 from vault.secrets where name = 'picture_check_secret');`);
  runAs(teacherId, `select public.create_class_space('${className}', 'Cercul de scriere.');`);
  const code = runAs(
    teacherId,
    `select public.make_class_invite('${classSlug}', 30, 10) ->> 'code';`,
  );
  runAs(studentId, `select public.join_class_space('${code}');`);
}

/** The student's name as the class shows it. */
function studentName(): string {
  return runSql(
    `select public.display_name(handle, pen_name) from public.profiles where id = '${studentId}';`,
  ).trim();
}

/** The certificate's code and ID, once signed. */
function certificate(): { code: string; id: string } {
  const [code = '', id = ''] = runSql(
    `select code || '|' || id from public.certificates where user_id = '${studentId}';`,
  )
    .trim()
    .split('|');
  return { code, id };
}

/** Opens a page in English, as a persona or as a visitor, with motion reduced. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    // The profile's language wins over the browser's, so set it first.
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

test.describe('writing certificates (CLASSES-e, S1-E8-12)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    cleanUp();
    setUp();
  });
  test.afterAll(cleanUp);

  test('the teacher approves the results and signs', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/spaces/${classSlug}/settings`);
    await page.getByRole('link', { name: 'Open certificates' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Certificates' })).toBeVisible();
    await page.getByLabel('Programme').fill(programme);
    await page.getByLabel(`Result for ${studentName()}`).selectOption('winner');
    // G13a: the teacher picks the look; it is saved on the certificate at signing.
    await page.getByRole('radio', { name: 'Sea glass', exact: true }).check({ force: true });
    await page.getByRole('radio', { name: 'Waves', exact: true }).check({ force: true });
    await expect(page.locator('[data-certificate-colour="sea_glass"]')).toBeVisible();
    // G13b: the school's crest in the seal, uploaded as an SVG and stored only as pixels (WebP or PNG).
    await page.getByRole('radio', { name: 'School crest' }).click();
    await page.getByRole('radio', { name: 'White on the certificate colour' }).click();
    await page
      .getByLabel('Upload a crest or logo')
      .setInputFiles({ name: 'crest.svg', mimeType: 'image/svg+xml', buffer: crestSvg });
    await expect(page.getByText('Checked. It shows in the seal.')).toBeVisible();
    await expect(page.locator('[data-certificate-seal="crest"]')).toBeVisible();
    expect(
      runSql(
        `select path ~ '\\.(webp|png)$' from public.picture_checks where kind = 'certificate_crest' order by created_at desc limit 1;`,
      ).trim(),
    ).toBe('t');
    await expect(page).not.toHaveTitle('crest script ran');
    await page.getByRole('button', { name: 'Approve and sign' }).click();
    await expect(page.getByText('Signed: 1 certificate made or changed.')).toBeVisible();
    await expect(page.getByText(certificate().code)).toBeVisible();
    await page.context().close();
  });

  test('the student prints it with their real name', async ({ browser }) => {
    const page = await openAs(browser, 'pending_check', '/certificates');
    await page.getByRole('link', { name: `Open “${programme}”` }).click();
    await page.getByLabel('Name to print').fill('Ana Popescu');
    await page.getByRole('button', { name: 'Save the name' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    const sheet = page.getByRole('article', { name: 'Certificate' });
    await expect(sheet.getByText('Ana Popescu')).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Certificate of achievement' })).toBeVisible();
    await expect(sheet.getByText(certificate().code)).toBeVisible();
    // The look the teacher signed with, and a real link to the check page.
    const frame = page.locator('.certificate-sheet');
    await expect(frame).toHaveAttribute('data-certificate-colour', 'sea_glass');
    await expect(frame.locator('[data-certificate-pattern="waves"]')).toHaveCount(1);
    await expect(frame.locator('[data-certificate-seal="crest"]')).toBeVisible();
    await expect(sheet.getByRole('link', { name: /\/verify$/ })).toHaveAttribute(
      'href',
      new RegExp(`/verify\\?code=${certificate().code}$`),
    );
    await page.getByLabel('Language of the certificate').selectOption('ro');
    await expect(
      page
        .getByRole('article', { name: 'Diplomă' })
        .getByRole('heading', { name: 'Diplomă de merit' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();
    await page.context().close();
  });

  test('a visitor checks the code and never sees the name', async ({ browser }) => {
    const page = await openAs(browser, null, `/verify?code=${certificate().code}`);
    await expect(page.getByText('This certificate is valid.')).toBeVisible();
    await expect(page.getByText(programme)).toBeVisible();
    await expect(page.getByText('Ana Popescu')).toHaveCount(0);
    await page.context().close();
  });

  test('staff revoke it and the check page says so', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/schools/certificates');
    await page.getByLabel('Certificate code').fill(certificate().code);
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByText('Ana Popescu')).toHaveCount(0);
    await page.getByLabel('Why are you revoking it?').fill('The result was entered by mistake.');
    await page.getByRole('button', { name: 'Revoke the certificate' }).click();
    await expect(page.getByText('The result was entered by mistake.')).toBeVisible();
    await page.context().close();

    const visitor = await openAs(browser, null, `/verify?code=${certificate().code}`);
    await expect(visitor.getByText('This certificate was revoked.')).toBeVisible();
    await visitor.context().close();
  });

  test('archiving the class tells the teacher in the app and by email', async ({ browser }) => {
    runAs(teacherId, `select public.archive_class_space('${classSlug}');`);
    const page = await openAs(browser, 'teacher', '/notifications');
    await expect(page.getByText(`the class space “${className}” is archived`)).toBeVisible();
    await page.context().close();
    const queued = runSql(
      `select count(*) from public.email_outbox where user_id = '${teacherId}' and delivery = 'required';`,
    ).trim();
    expect(queued).toBe('1');
  });

  test('axe: every certificate screen, every view', async ({ browser }) => {
    test.setTimeout(600_000);
    const { id, code } = certificate();
    const screens: { persona: SignInPersonaName | null; address: string }[] = [
      { persona: 'pending_check', address: '/certificates' },
      { persona: 'pending_check', address: `/certificates/${id}` },
      { persona: 'teacher', address: `/spaces/${classSlug}/certificates` },
      { persona: 'moderator', address: '/staff/schools/certificates' },
      { persona: null, address: `/verify?code=${code}` },
    ];
    for (const screen of screens) {
      const context = await browser.newContext();
      if (screen.persona !== null) {
        await useSessionInBrowser(context, (await signInPersona(screen.persona)).session);
      }
      const page = await context.newPage();
      for (const view of everyView([screen.address])) {
        if (screen.persona !== null) {
          runSql(
            `update public.profiles set locale = '${view.language}' where handle = '${screen.persona}';`,
          );
        }
        await checkScreen(page, view);
        await expectNoDoodles(page);
      }
      await context.close();
    }
  });
});
