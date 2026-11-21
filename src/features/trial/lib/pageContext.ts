/**
 * The details a bug report carries on its own (TRIAL-FEEDBACK; board J31: "We also send the page
 * address, your browser and your screen size").
 *
 * Who calls it: hooks/useBugReport.ts, when the tester presses Send.
 * What it calls: nothing; it reads the address, the browser's user agent and the window.
 * Privacy (CLAUDE.md rule 12): only the path, never the query or the hash, which can hold a
 * sign-in link's code; the browser as a name, a major version and a system, never the whole user
 * agent string; sizes in CSS pixels.
 */
import type { PageContext } from '@/schemas/contact';

/** Browsers to look for, most specific first: Edge and Opera also say "Chrome". */
const browserPatterns: { name: string; pattern: RegExp }[] = [
  { name: 'Edge', pattern: /Edg\/(\d+)/ },
  { name: 'Opera', pattern: /OPR\/(\d+)/ },
  { name: 'Firefox', pattern: /Firefox\/(\d+)/ },
  { name: 'Chrome', pattern: /Chrome\/(\d+)/ },
  { name: 'Safari', pattern: /Version\/(\d+)[^ ]* (?:Mobile\/\S+ )?Safari/ },
];

/** Systems to look for; iPhones and iPads say "like Mac OS X", so they come first. */
const systemPatterns: { name: string; pattern: RegExp }[] = [
  { name: 'iOS', pattern: /iPhone|iPad|iPod/ },
  { name: 'Android', pattern: /Android/ },
  { name: 'Windows', pattern: /Windows/ },
  { name: 'macOS', pattern: /Mac OS X|Macintosh/ },
  { name: 'ChromeOS', pattern: /CrOS/ },
  { name: 'Linux', pattern: /Linux/ },
];

/**
 * Names the browser in a few words, from its user agent.
 *
 * @param userAgent - navigator.userAgent
 * @returns for example "Firefox 133 on Windows", or "Unknown browser" when nothing matches
 */
export function describeBrowser(userAgent: string): string {
  // Step 1: the first browser whose version we can read.
  let browser = 'Unknown browser';
  for (const candidate of browserPatterns) {
    const match = candidate.pattern.exec(userAgent);
    if (match !== null) {
      browser = `${candidate.name} ${match[1] ?? ''}`.trim();
      break;
    }
  }
  // Step 2: the system, when it says one.
  const system = systemPatterns.find((candidate) => candidate.pattern.test(userAgent));
  return system === undefined ? browser : `${browser} on ${system.name}`;
}

/**
 * The page details for a report made right now.
 *
 * @returns the path, the browser and the window and screen sizes
 */
export function currentPageContext(): PageContext {
  return {
    pagePath: window.location.pathname,
    browser: describeBrowser(navigator.userAgent),
    screenSize: `${String(window.innerWidth)} × ${String(window.innerHeight)} window, ${String(window.screen.width)} × ${String(window.screen.height)} screen`,
  };
}
