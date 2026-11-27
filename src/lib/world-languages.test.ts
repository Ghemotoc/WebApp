/**
 * Tests for the list of every language a story may be written in (src/lib/world-languages.ts;
 * story S1-E3-01, Robert, 26 Nov 2026).
 * Who runs it: Vitest, in CI and in `npm test`.
 * It also reads supabase/schema.sql, the live schema, so the picker never offers a language the
 * database would refuse, nor misses one it accepts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { worldLanguageCodes } from './world-languages';

/**
 * The codes inside public.world_language_codes() in the schema file, between its two markers.
 *
 * @returns the codes in the order the database lists them
 */
function databaseCodes(): string[] {
  const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');
  const start = schema.indexOf('-- world-language-codes:start');
  const end = schema.indexOf('-- world-language-codes:end');
  const body = schema.slice(start, end);
  return Array.from(body.matchAll(/'([a-z]{2})'/g), (match) => match[1] ?? '');
}

describe('the languages a story may be written in', () => {
  it('holds the 182 ISO 639-1 languages, each once, in code order', () => {
    expect(worldLanguageCodes).toHaveLength(182);
    expect(new Set(worldLanguageCodes).size).toBe(182);
    expect([...worldLanguageCodes].sort()).toEqual(worldLanguageCodes);
  });

  it('includes the site languages and languages nobody opened before', () => {
    for (const code of ['ro', 'en', 'sv', 'da', 'nb', 'ja', 'hu', 'sw']) {
      expect(worldLanguageCodes).toContain(code);
    }
  });

  it('names every language in Romanian and English, never by its bare code', () => {
    for (const interfaceLanguage of ['ro', 'en']) {
      const names = new Intl.DisplayNames([interfaceLanguage], { type: 'language' });
      for (const code of worldLanguageCodes) {
        expect(names.of(code)).not.toBe(code);
      }
    }
  });

  it('is the same list the database accepts', () => {
    expect(databaseCodes()).toEqual(worldLanguageCodes);
  });
});
