/**
 * Tests for the two generators behind the username checks (story S1-E2-04):
 * scripts/build-confusables-migration.ts and scripts/build-word-list-migration.ts.
 * The last test also proves the committed word-list migration matches the lists in content/,
 * so a list can't change without its migration.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildConfusablesMigration,
  parseConfusablesJson,
  parseConfusablesText,
} from './build-confusables-migration';
import { buildWordListMigration, parseWordList, readWordLists } from './build-word-list-migration';

describe('the look-alike characters migration', () => {
  it('reads Unicode’s confusables.txt lines and skips comments', () => {
    const fileText =
      '# comment\n0430 ;\t0061 ;\tMA\t# ( а → a ) CYRILLIC SMALL LETTER A\n\n006D ;\t0072 006E ;\tMA\n';
    expect(parseConfusablesText(fileText)).toEqual([
      { sourceText: 'а', prototypeText: 'a' },
      { sourceText: 'm', prototypeText: 'rn' },
    ]);
  });

  it('reads the JSON form of the same list', () => {
    expect(parseConfusablesJson('{"0": "O"}')).toEqual([{ sourceText: '0', prototypeText: 'O' }]);
  });

  it('doubles single quotes so a quote-like character can’t break the SQL', () => {
    const sql = buildConfusablesMigration([{ sourceText: 'ʼ', prototypeText: "'" }], '10.0.0');
    expect(sql).toContain("('ʼ', '''')");
  });

  it('refuses a character listed twice', () => {
    const pair = { sourceText: 'а', prototypeText: 'a' };
    expect(() => buildConfusablesMigration([pair, pair], '10.0.0')).toThrow('appears twice');
  });
});

describe('the swearword list migration', () => {
  it('reads words, whole-word entries and comments', () => {
    expect(parseWordList('# note\nword\n=short # inline\n\n', 'en')).toEqual([
      { language: 'en', word: 'word', matchRule: 'anywhere' },
      { language: 'en', word: 'short', matchRule: 'whole_word' },
    ]);
  });

  it('refuses a word with a space or a quote, which would be a typing mistake', () => {
    expect(() => parseWordList('two words\n', 'en')).toThrow('quote or a space');
    expect(() => parseWordList("it's\n", 'en')).toThrow('quote or a space');
  });

  it('refuses a word listed twice in one language', () => {
    const entry = { language: 'ro', word: 'abc', matchRule: 'anywhere' as const };
    expect(() => buildWordListMigration([entry, entry])).toThrow('appears twice');
  });

  it('the committed migration matches the lists in content/username-word-lists/', () => {
    // Find the newest word-list migration and compare it with what the lists would generate now.
    const migrationsFolder = fileURLToPath(new URL('../supabase/migrations', import.meta.url));
    const newest = readdirSync(migrationsFolder)
      .filter((fileName) => fileName.endsWith('_username_word_lists.sql'))
      .sort()
      .at(-1);
    expect(newest).toBeDefined();
    const committed = readFileSync(`${migrationsFolder}/${String(newest)}`, 'utf8');
    const listsFolder = fileURLToPath(new URL('../content/username-word-lists', import.meta.url));
    expect(committed).toBe(buildWordListMigration(readWordLists(listsFolder)));
  });
});
