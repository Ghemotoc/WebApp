/**
 * lookCheck: measures a member page in the browser against the design books' look rules
 * (user stories, Section 1 "look rules every story must pass", story 0.1; Robert, 23 Nov 2026).
 *
 * The rules say every text size, weight, corner and gap on a member page is one of a small set
 * of values, all of them tokens or component defaults. This helper walks every visible element,
 * reads its computed style and lists each value outside the set, with a short path to the
 * element, so a spec can assert the list is empty and a person can see what drifted.
 *
 * What it checks (the allowed values come from Section 1 and src/styles/index.css):
 * - font sizes: the type scale, 48, 32, 24, 20, 17, 15, 13 and 12 px, plus 34 and 28 px line
 *   heights' text sizes for reading (20 and 17 px), which are already in the list;
 * - font weights: 400, 600 and 700 (no 500, 800 or 900);
 * - corners: 0, 12 and 16 px, and full round (half the element's height or more); 4 px only on
 *   a cover's paper label (the brand page recipe);
 * - gaps, padding and margins: 0, 4, 8, 12, 16, 24, 32, 48, 64 and 80 px.
 * What it leaves out: elements hidden from view or kept only for screen readers, the reader's
 * story text (readers set its size in Aa; marked data-story-text), the 36 px right padding the DoD
 * gives every select, drawn covers (data-cover-design: their titles are sized
 * in cqi so they scale with the cover) and anything marked data-look-exempt with a reason in the code.
 *
 * Who uses it: the bundle specs (e2e/*.spec.ts) through expectLookRules(), or
 * expectLookRulesByDayAndNight() to open a page as a persona in both themes first (BOOKS-8b).
 * What it calls: Playwright's page.evaluate, so the measuring runs inside the page.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { THEME_STORAGE_KEY } from '../../src/lib/theme';

import { LANGUAGE_STORAGE_KEY } from './accessibility';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './personas';

/** One value outside the rules: which element, which property and what it measured. */
export interface LookIssue {
  element: string;
  property: string;
  value: string;
}

/** The allowed values, passed into the page as plain arrays. */
const lookRules = {
  fontSizes: [48, 32, 24, 20, 17, 15, 13, 12],
  fontWeights: [400, 600, 700],
  corners: [0, 12, 16],
  spacing: [0, 4, 8, 12, 16, 24, 32, 48, 64, 80],
};

/**
 * Measures the page as it is on screen now.
 *
 * @param page - a member page, loaded and settled
 * @returns every value outside the rules, at most one entry per element and property
 */
export async function findLookIssues(page: Page): Promise<LookIssue[]> {
  return page.evaluate((rules) => {
    const issues: { element: string; property: string; value: string }[] = [];

    /** A short, readable path to an element, for the report. */
    function describe(element: Element): string {
      const parts: string[] = [];
      let current: Element | null = element;
      while (current !== null && parts.length < 3) {
        const name = current.tagName.toLowerCase();
        const label = current.getAttribute('aria-label') ?? current.getAttribute('data-testid');
        parts.unshift(label === null ? name : `${name}[${label.slice(0, 24)}]`);
        current = current.parentElement;
      }
      const text = (element.textContent ?? '').trim().slice(0, 30);
      return `${parts.join(' > ')}${text === '' ? '' : ` "${text}"`}`;
    }

    /** True when a measured pixel value is one of the allowed ones (half a pixel either way). */
    function isAllowed(pixels: number, allowed: number[]): boolean {
      return allowed.some((value) => Math.abs(pixels - value) < 0.5);
    }

    /** True for parts the rules leave out: hidden, the writer's own text, drawn cover words. */
    function isLeftOut(element: Element, style: CSSStyleDeclaration): boolean {
      if (style.display === 'none' || style.visibility === 'hidden') return true;
      const box = element.getBoundingClientRect();
      // Hidden from sight but kept for screen readers (sr-only, 1 × 1 px with -1 px margins).
      if (box.width <= 1 || box.height <= 1) return true;
      // The skip link and other sr-only parts that show only on focus are clipped away until then.
      if (style.position === 'absolute' && style.clipPath === 'inset(50%)') return true;
      if (element.classList.contains('sr-only')) return true;
      return (
        element.closest('[data-story-text], [data-cover-design], [data-look-exempt], svg') !== null
      );
    }

    /** Checks the text size and weight of an element that holds text of its own. */
    function checkType(element: Element, style: CSSStyleDeclaration) {
      const ownText = Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
      );
      if (!ownText) return;
      const size = parseFloat(style.fontSize);
      if (!isAllowed(size, rules.fontSizes)) {
        issues.push({ element: describe(element), property: 'font-size', value: style.fontSize });
      }
      if (!rules.fontWeights.includes(Number(style.fontWeight))) {
        issues.push({
          element: describe(element),
          property: 'font-weight',
          value: style.fontWeight,
        });
      }
    }

    /** Checks the corners: one of the set, or full round. */
    function checkCorners(element: Element, style: CSSStyleDeclaration) {
      const radius = parseFloat(style.borderTopLeftRadius);
      if (Number.isNaN(radius) || isAllowed(radius, rules.corners)) return;
      const box = element.getBoundingClientRect();
      if (radius >= Math.min(box.width, box.height) / 2 - 0.5) return;
      issues.push({
        element: describe(element),
        property: 'border-radius',
        value: style.borderTopLeftRadius,
      });
    }

    /** Checks gaps, padding and margins against the spacing steps. */
    function checkSpacing(element: Element, style: CSSStyleDeclaration) {
      const properties = [
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'marginTop',
        'marginBottom',
        'rowGap',
        'columnGap',
      ] as const;
      for (const property of properties) {
        const raw = style[property];
        if (raw === 'normal' || raw === 'auto' || raw === '') continue;
        const pixels = Math.abs(parseFloat(raw));
        if (Number.isNaN(pixels) || isAllowed(pixels, rules.spacing)) continue;
        // The DoD's drop-down rule: 36 px on the right of a select, so the chevron sits after the text.
        if (
          element.tagName === 'SELECT' &&
          property === 'paddingRight' &&
          Math.abs(pixels - 36) < 0.5
        )
          continue;
        issues.push({ element: describe(element), property, value: raw });
      }
    }

    // Walk every element in the page body once.
    for (const element of Array.from(document.body.querySelectorAll('*'))) {
      const style = getComputedStyle(element);
      if (isLeftOut(element, style)) continue;
      checkType(element, style);
      checkCorners(element, style);
      checkSpacing(element, style);
    }
    return issues;
  }, lookRules);
}

/**
 * Fails the test when anything on the page is outside the look rules, listing each value.
 *
 * @param page - a member page, loaded and settled
 */
export async function expectLookRules(page: Page): Promise<void> {
  const issues = await findLookIssues(page);
  const report = issues.map((issue) => `${issue.property} ${issue.value} on ${issue.element}`);
  expect(report, 'values outside the design books look rules').toEqual([]);
}

/**
 * Opens a page as a persona in English at 1440 px, by day and then at night, waits until it is
 * ready and checks it against the look rules (BOOKS-8b: the teacher's class pages).
 *
 * @param browser - the test's browser
 * @param persona - who looks; their profile's language must already be English
 * @param address - the page
 * @param waitUntilReady - waits for something the page shows once its data has loaded
 */
export async function expectLookRulesByDayAndNight(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  waitUntilReady: (page: Page) => Promise<void>,
): Promise<void> {
  for (const theme of ['day', 'night'] as const) {
    // Step 1: a fresh browser with the persona signed in, English and the theme chosen.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
    await context.addInitScript(
      ([languageKey, themeKey, chosenTheme]) => {
        localStorage.setItem(languageKey, 'en');
        localStorage.setItem(themeKey, chosenTheme);
      },
      [LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY, theme] as const,
    );
    // Step 2: the page, once its data is in.
    const page = await context.newPage();
    await page.goto(address);
    await waitUntilReady(page);
    await page.waitForLoadState('networkidle');
    // Step 3: every size, weight, corner and gap against the rules.
    await test.step(`${address}, ${theme}`, () => expectLookRules(page));
    await context.close();
  }
}
