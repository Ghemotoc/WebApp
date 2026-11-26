// @ts-nocheck
// Temporary look-check helper for bundle 4 (boards E11 to E13). Never committed.
import { test } from '@playwright/test';

import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const out = '/tmp/claude-0/-home-claude/eb2d8a3e-e085-5a11-93f0-b03dc45b32b3/scratchpad/look-b4';

const pages: [string, string, string, string?][] = [
  ['E11', '/notifications', 'adult_writer'],
  ['E12', '/messages', 'teacher'],
  ['E13', '/messages/adult_writer', 'teacher', 'delete'],
];

test('shots', async ({ browser }) => {
  test.setTimeout(900_000);
  const fs = await import('node:fs');
  fs.mkdirSync(out, { recursive: true });
  runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
  const extra = process.env.LOOK_SQL;
  if (extra) runSql(fs.readFileSync(extra, 'utf8'));
  const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
  const themes = (process.env.THEMES ?? 'light,night').split(',');
  const widths = (process.env.WIDTHS ?? '1440').split(',').map(Number);
  for (const width of widths) {
    for (const theme of themes) {
      for (const [board, path, persona, action] of pages.filter(
        ([b]) => only.length === 0 || only.includes(b),
      )) {
        const context = await browser.newContext({ viewport: { width, height: 1000 } });
        await useSessionInBrowser(context, (await signInPersona(persona)).session);
        await context.addInitScript((t) => {
          localStorage.setItem('theme-preference', t);
          localStorage.setItem('interface-language', 'en');
        }, theme);
        const page = await context.newPage();
        await page.goto(path);
        await page.waitForTimeout(2500);
        try {
          if (action === 'delete' && width >= 1024 && process.env.NO_DELETE !== '1') {
            await page.getByRole('button', { name: /^Delete chat$/ }).first().click({ timeout: 8000 });
            await page.waitForTimeout(600);
          }
        } catch (error) {
          console.log(board, 'action failed', String(error).slice(0, 200));
        }
        const suffix = width === 1440 ? '' : `-${width}`;
        await page.screenshot({ path: `${out}/${board}-built-${theme}${suffix}.png`, fullPage: true });
        const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (sideways) console.log(board, theme, width, 'SIDEWAYS SCROLL');
        await context.close();
      }
    }
  }
  if (process.env.LOOK_CLEAN) runSql(fs.readFileSync(process.env.LOOK_CLEAN, 'utf8'));
});

test('break', async ({ browser }) => {
  test.setTimeout(300_000);
  const log = (...a: unknown[]) => console.log('BREAK', ...a);
  const open = async (persona: string | null, path: string, lang = 'en') => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    if (persona) {
      runSql(`update public.profiles set locale = '${lang}' where handle = '${persona}';`);
      await useSessionInBrowser(context, (await signInPersona(persona)).session);
    }
    await context.addInitScript((l) => localStorage.setItem('interface-language', l), lang);
    const page = await context.newPage();
    await page.goto(path);
    await page.waitForTimeout(2000);
    return page;
  };
  // Signed out.
  let p = await open(null, '/messages/teacher');
  log('signed out /messages/teacher ->', new URL(p.url()).pathname);
  p = await open(null, '/notifications');
  log('signed out /notifications ->', new URL(p.url()).pathname);
  // Empty send, then a long message, then a double click.
  p = await open('adult_writer', '/messages/teacher');
  await p.getByRole('button', { name: 'Send', exact: true }).click();
  log('empty send says:', await p.getByText(/Write a message|Type/).first().textContent().catch(() => 'none'));
  const box = p.getByLabel('Message to teacher');
  await box.fill('x'.repeat(2100));
  log('long value length', (await box.inputValue()).length);
  await box.fill('Break test once');
  await p.getByRole('button', { name: 'Send', exact: true }).dblclick();
  await p.waitForTimeout(2500);
  log('double click sent copies:', await p.getByRole('region', { name: /^Messages with/ }).getByText('Break test once').count());
  const sideways = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  log('long text sideways', sideways);
  // A blocked person and an unknown handle.
  p = await open('blocker', '/messages/blocked');
  log('blocker -> blocked: box?', await p.getByLabel(/^Message to/).count(), (await p.locator('main').innerText()).slice(0, 200).replace(/\n/g, ' | '));
  p = await open('adult_writer', '/messages/nobody_here_zz');
  log('unknown handle:', (await p.locator('main').innerText()).slice(0, 200).replace(/\n/g, ' | '));
  // A 14-year-old direct link and New chat in Romanian.
  p = await open('adult_writer', '/messages', 'ro');
  await p.getByRole('button', { name: /conversație nouă|Conversație nouă/i }).first().click().catch((e) => log('ro new chat button', String(e).slice(0, 120)));
  await p.waitForTimeout(1500);
  log('ro dialog:', (await p.getByRole('dialog').innerText().catch(() => 'no dialog')).slice(0, 300).replace(/\n/g, ' | '));
  p = await open('adult_writer', '/notifications', 'ro');
  log('ro notifications:', (await p.locator('main').innerText()).slice(0, 300).replace(/\n/g, ' | '));
  runSql(`delete from public.messages where body = 'Break test once'; update public.profiles set locale='ro' where handle in ('adult_writer','blocker');`);
});
