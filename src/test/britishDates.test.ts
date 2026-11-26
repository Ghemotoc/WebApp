/**
 * The British dates guard (bundle 10; Robert writes British English, CTO, 24 Oct 2026).
 *
 * Intl formats the bare language "en" the American way ("November 25, 2026, 7:12 PM"). The app
 * shows "25 November 2026, 19:12" because every date goes through dateLocaleFor() in
 * src/lib/romania-time.ts, which turns "en" into "en-GB". This test reads every TypeScript file
 * under src/ and fails the build if a date is formatted straight from the interface language again.
 * Who runs it: Vitest (`npm test`), in CI on every pull request.
 */
import { describe, expect, it } from 'vitest';

/** Every TypeScript source file under src/, as text, loaded by Vite. */
const sourceFiles = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/**
 * A date formatter fed the interface language as it is, such as
 * `new Intl.DateTimeFormat(i18n.language, …)` or `date.toLocaleDateString(language)`.
 */
const americanDatePattern =
  /(Intl\.DateTimeFormat\(|toLocale(?:Date|Time)?String\()(?:i18n\.language|language)[,)]/;

describe('dates read the British way in English', () => {
  it('finds the source files', () => {
    expect(Object.keys(sourceFiles).length).toBeGreaterThan(500);
  });

  it('no source file formats a date straight from the interface language', () => {
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(sourceFiles)) {
      // Tests may format with a fixed language on purpose; this file names the pattern.
      if (path.includes('.test.')) continue;
      if (americanDatePattern.test(text)) offenders.push(path);
    }
    expect(offenders, 'wrap the language in dateLocaleFor() from src/lib/romania-time').toEqual([]);
  });
});
