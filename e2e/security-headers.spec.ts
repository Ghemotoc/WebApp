/**
 * The security headers in a real browser (independent QA check, 5 Nov 2026, finding X1;
 * architecture 1.9: "strict Content Security Policy").
 *
 * Who runs it: `npm run test:e2e`. The preview server sends the same headers as dist/_headers on
 * Cloudflare (vite.config.ts, server/security-headers.ts), and every other spec runs under them
 * too, so a screen the policy breaks fails there as well.
 * What it proves:
 * - the home page, Discover and a shared-story link (/s/, a Pages Function) carry the
 *   Content-Security-Policy, nosniff, frame and referrer headers;
 * - those pages, signed out and signed in (Realtime included), load without one policy violation.
 * Test data: none; it reads the seed story "statia-meteo-seed01" and signs in as teacher.
 */
import { expect, test, type Page } from '@playwright/test';

import { signInPersona, useSessionInBrowser } from './support/personas';

/** The pages checked: the start page, Discover and a shared-story address. */
const addresses = ['/', '/discover', '/s/statia-meteo-seed01'];

/**
 * Collects every policy violation the page reports, from before its first script runs.
 *
 * @param page - a fresh page
 * @returns a function that gives the violations on the current page ("directive: blocked address");
 *   the list starts again on every navigation, so read it before going to the next address
 */
async function watchViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(
        `${event.effectiveDirective}: ${event.blockedURI} ${event.sourceFile}:${event.lineNumber}:${event.columnNumber}`,
      );
    });
  });
  return () =>
    page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
}

test.describe('security headers (QA-1c)', () => {
  for (const address of addresses) {
    test(`${address} is sent with the security headers`, async ({ request }) => {
      const answer = await request.get(address);
      expect(answer.ok()).toBe(true);
      const headers = answer.headers();
      expect(headers['content-security-policy']).toContain("default-src 'self'");
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  }

  test('the pages load without a policy violation, signed out', async ({ page }) => {
    const violations = await watchViolations(page);
    const seen: string[] = [];
    for (const address of addresses) {
      await page.goto(address);
      await page.waitForLoadState('networkidle');
      seen.push(...(await violations()).map((violation) => `${address} ${violation}`));
    }
    expect(seen).toEqual([]);
  });

  test('the pages load without a policy violation, signed in', async ({ browser }) => {
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    const page = await context.newPage();
    const violations = await watchViolations(page);
    const seen: string[] = [];
    for (const address of [...addresses, '/notifications', '/library']) {
      await page.goto(address);
      await page.waitForLoadState('networkidle');
      seen.push(...(await violations()).map((violation) => `${address} ${violation}`));
    }
    expect(seen).toEqual([]);
    await context.close();
  });
});
