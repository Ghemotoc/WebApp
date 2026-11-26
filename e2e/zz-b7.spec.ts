// @ts-nocheck
// Temporary look-check helper for bundle 7 (boards F01 to F12). Never committed.
import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const scratch = '/tmp/claude-0/-home-claude/eb2d8a3e-e085-5a11-93f0-b03dc45b32b3/scratchpad';
const out = `${scratch}/look-b7`;

test.afterAll(() => {
  runSql(readFileSync(`${scratch}/b7/look-cleanup.sql`, 'utf8'));
});

test('shots', async ({ browser }) => {
  test.setTimeout(900_000);
  runSql(readFileSync(`${scratch}/b7/look-seed.sql`, 'utf8'));
  if (process.env.EXTRA) runSql(readFileSync(process.env.EXTRA, 'utf8'));
  runSql(`update public.profiles set locale = 'en';`);
  const busy = runSql(
    `select thread_number from public.forum_threads where title = 'How do you start a chapter without a prologue?'`,
  );
  const pages: [string, string, string, string?][] = [
    ['F01', '/forums', 'adult_writer'],
    ['F02', '/forums/search?q=prologue', 'adult_writer'],
    ['F03', '/forums/first-chapters', 'adult_writer'],
    ['F04', '/forums/first-chapters/new', 'adult_writer'],
    ['F05', `/forums/first-chapters/${busy}`, 'adult_writer'],
    ['F06', '/spaces', 'adult_writer'],
    ['F07', '/spaces/new', 'teen_17'],
    ['F08', '/spaces/fantasy-writers-circle', 'teacher'],
    ['F09', '/spaces/fantasy-writers-circle/new', 'teacher'],
    ['F10', '/spaces/fantasy-writers-circle/settings', 'adult_writer'],
    ['F11', '/spaces/fantasy-writers-circle/members', 'adult_writer'],
    ['F12', '/spaces/fantasy-writers-circle/log', 'adult_writer'],
  ];
  const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
  const themes = (process.env.THEMES ?? 'light,night').split(',');
  const widths = (process.env.WIDTHS ?? '1440').split(',').map(Number);
  for (const width of widths) {
    for (const theme of themes) {
      for (const [board, path, persona] of pages.filter(
        ([b]) => only.length === 0 || only.includes(b),
      )) {
        const context = await browser.newContext({ viewport: { width, height: 1000 } });
        if (persona !== 'visitor') {
          await useSessionInBrowser(context, (await signInPersona(persona)).session);
        }
        await context.addInitScript((t) => {
          localStorage.setItem('theme-preference', t);
          localStorage.setItem('interface-language', 'en');
        }, theme);
        const page = await context.newPage();
        await page.goto(path);
        await page.waitForTimeout(2500);
        const suffix = width === 1440 ? '' : `-${width}`;
        await page.screenshot({
          path: `${out}/${board}-built-${theme}${suffix}.png`,
          fullPage: true,
        });
        if (width !== 1440) {
          const wide = await page.evaluate(() => document.documentElement.scrollWidth);
          if (wide > width) console.log(board, theme, width, 'scrolls sideways', wide);
        }
        await context.close();
      }
    }
  }
});
