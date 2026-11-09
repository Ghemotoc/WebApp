/**
 * The no-doodles guard for the source files (bundle NO-DOODLES; Robert, 9 Nov 2026: no doodles
 * anywhere in the app, and the "Doodles" cover pattern gets another name).
 *
 * It reads every TypeScript, TSX and CSS file under src/ and every locale file, and fails the build
 * if a doodle comes back: the old markers (`data-doodle`, the `tmc-dd-*` breakpoint classes, the
 * `--doodle-*` colour tokens), an import from the old doodle or hand-drawn icon folders, or the
 * word in text people read. Comments that say a screen has no doodles are fine, so only code and
 * locale text are checked, not the word in general.
 * Who runs it: Vitest (`npm test`), in CI on every pull request. The e2e guard
 * e2e/support/noDoodles.ts checks what the browser draws.
 */
import { describe, expect, it } from 'vitest';

/** Every source file under src/, as text, loaded by Vite. */
const sourceFiles = import.meta.glob<string>('/src/**/*.{ts,tsx,css}', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** Every locale file in both languages, loaded the way the app loads them. */
const localeFiles = import.meta.glob<Record<string, unknown>>('/src/locales/*/*.json', {
  eager: true,
  import: 'default',
});

/** Code that would bring a doodle back, with what each one was. */
const doodleMarkers: { pattern: RegExp; what: string }[] = [
  { pattern: /data-doodle/, what: 'the data-doodle marker' },
  { pattern: /tmc-dd-/, what: 'a doodle breakpoint class' },
  { pattern: /--doodle-/, what: 'a doodle colour token' },
  {
    pattern: /from ['"][^'"]*\/(doodles|doodleSources|DoodleSection)[^'"]*['"]/,
    what: 'a doodle import',
  },
  { pattern: /assets\/(doodles|icons)\//, what: 'the old doodle or hand-drawn icon folder' },
];

/** Words for "doodle" in the two interface languages, lower case. */
const doodleWords = ['doodle', 'mâzgăl'];

/** Every string in a locale file, however deep. */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe('no doodles come back', () => {
  it('finds the source and locale files', () => {
    expect(Object.keys(sourceFiles).length).toBeGreaterThan(500);
    expect(Object.keys(localeFiles).length).toBeGreaterThan(10);
  });

  it('no source file uses a doodle marker, token or file', () => {
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(sourceFiles)) {
      // This file names the markers on purpose, to look for them.
      if (path.endsWith('/noDoodles.test.ts')) continue;
      for (const marker of doodleMarkers) {
        if (marker.pattern.test(text)) offenders.push(`${path}: ${marker.what}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  for (const [path, contents] of Object.entries(localeFiles)) {
    it(`${path} never mentions a doodle`, () => {
      const mentions = allStrings(contents).filter((value) =>
        doodleWords.some((word) => value.toLowerCase().includes(word)),
      );
      expect(mentions).toEqual([]);
    });
  }
});
