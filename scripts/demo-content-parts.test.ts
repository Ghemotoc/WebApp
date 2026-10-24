/**
 * Tests for the split demo top-up (Lane B; CTO, 24 Oct 2026: the SQL Editor refused the 2.6 MB
 * single file). Proves: every part is under the limit and wraps its statements in its own
 * transaction behind the personas guard; part 01 alone holds the settings and accounts and the
 * last part alone the check query; the statements keep their order, so a chapter never comes
 * before its story; a statement too big for any part is refused; the parts hold exactly the
 * single file's story and chapter statements, in the same order; and the committed parts match
 * a fresh build. The same rows from both, on a real database: npm run demo:compare-parts.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildTopUpSql,
  classicsTextsFolder,
  demoStoriesFolder,
  readStories,
  topUpPartsFolder,
  topUpPieces,
} from './build-demo-content';
import { maximumPartBytes, splitIntoParts, type TopUpPieces } from './demo-content-parts';

/** Small pieces: a guard, an opening and six numbered statements of 100 bytes each. */
const smallPieces: TopUpPieces = {
  guard: '-- guard\n',
  opening: '-- opening\n',
  statements: Array.from(
    { length: 6 },
    (_, index) => `-- statement ${index}`.padEnd(99, '.') + '\n',
  ),
  checkQuery: 'select 1 as after_top_up;\n',
};

/** The real top-up, built from the files in the repository. */
const demo = readStories(demoStoriesFolder, /^demo-\d\d\.md$/);
const classics = readStories(classicsTextsFolder, /^classic-.*\.md$/);
const realPieces = topUpPieces(demo.stories, classics.stories);
const realParts = splitIntoParts(realPieces);

describe('splitting the top-up', () => {
  it('starts a new part when the next statement would pass the limit', () => {
    const parts = splitIntoParts(smallPieces, 800);

    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(Buffer.byteLength(part)).toBeLessThanOrEqual(800);
  });

  it('wraps every part in its own transaction behind the guard', () => {
    for (const part of splitIntoParts(smallPieces, 800)) {
      expect(part).toMatch(/^-- Staging top-up[\s\S]*\nbegin;\n\n-- guard\n/);
      expect(part).toMatch(/\ncommit;\n/);
    }
  });

  it('puts the opening in part 01 only and the check query in the last part only', () => {
    const parts = splitIntoParts(smallPieces, 800);

    expect(parts.filter((part) => part.includes('-- opening'))).toEqual([parts[0]]);
    expect(parts.filter((part) => part.includes('after_top_up'))).toEqual([parts.at(-1)]);
  });

  it('keeps every statement once, in the same order', () => {
    const joined = splitIntoParts(smallPieces, 800).join('');
    const positions = smallPieces.statements.map((statement) => joined.indexOf(statement));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((first, second) => first - second)).toEqual(positions);
  });

  it('refuses a statement too big for any part', () => {
    const tooBig = { ...smallPieces, statements: ['x'.repeat(2000)] };

    expect(() => splitIntoParts(tooBig, 800)).toThrow('too big for a part');
  });
});

describe('the real top-up in parts', () => {
  it('keeps every part under 500 KB, counted in bytes', () => {
    expect(maximumPartBytes).toBeLessThan(500_000);
    for (const part of realParts)
      expect(Buffer.byteLength(part)).toBeLessThanOrEqual(maximumPartBytes);
  });

  it("holds exactly the single file's story and chapter statements, in the same order", () => {
    const single = buildTopUpSql(demo.stories, classics.stories);
    const joinedParts = realParts.join('');
    let searchFrom = 0;
    for (const statement of realPieces.statements) {
      const position = single.indexOf(statement.trimStart(), searchFrom);
      expect(position).toBeGreaterThanOrEqual(searchFrom);
      searchFrom = position;
      expect(joinedParts).toContain(statement);
    }
    const inserts = (sql: string) =>
      sql.match(/^insert into public\.(stories|chapters) /gm)?.length;
    expect(inserts(joinedParts)).toBe(inserts(single));
  });

  it('matches the committed part files', () => {
    const committed = readdirSync(topUpPartsFolder)
      .filter((name) => /^part-\d+\.sql$/.test(name))
      .sort()
      .map((name) => readFileSync(join(topUpPartsFolder, name), 'utf8'));

    expect(committed).toEqual(realParts);
  });
});
