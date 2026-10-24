/**
 * Honest wording about copying (story S1-E4-06a; decided 16 Oct 2026, Q9: copy protection
 * "makes copying harder", never "can't be copied" or "screenshots are blocked").
 *
 * It reads every locale file, in both languages, and fails if any text promises more than the
 * product does. Store listings and help pages (CMS) follow the same rule; their text isn't in the
 * locale files.
 */
import { describe, expect, it } from 'vitest';

/** Every locale file in both languages, loaded the way the app loads them (by Vite). */
const localeFiles = import.meta.glob<Record<string, unknown>>('/src/locales/*/*.json', {
  eager: true,
  import: 'default',
});

/** Phrases that promise more than the web can do, in English and Romanian, lower case. */
const bannedPhrases = [
  "can't be copied",
  'can’t be copied',
  'cannot be copied',
  'copy-proof',
  'screenshots are blocked',
  'screenshots blocked',
  'blocks screenshots',
  'nu poate fi copiat',
  'nu pot fi copiate',
  'nu poate fi copiată',
  'capturile de ecran sunt blocate',
  'blochează capturile de ecran',
];

/** Every string in a locale file, however deep. */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe('wording about copying', () => {
  it('finds the locale files', () => {
    expect(Object.keys(localeFiles).length).toBeGreaterThan(10);
  });

  for (const [path, contents] of Object.entries(localeFiles)) {
    it(`${path} never promises that copying or screenshots are impossible`, () => {
      const offending = allStrings(contents).filter((text) =>
        bannedPhrases.some((phrase) => text.toLowerCase().includes(phrase)),
      );
      expect(offending).toEqual([]);
    });
  }

  it('the reader’s notice says copying is made harder and screenshots still work', () => {
    const english = localeFiles['/src/locales/en/reading.json'] as {
      reader: { copyNotice: string };
    };
    expect(english.reader.copyNotice).toContain('makes copying harder');
    expect(english.reader.copyNotice).toContain('can’t stop screenshots');
  });
});
