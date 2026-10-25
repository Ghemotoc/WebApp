/**
 * Tests for the demo content top-up part 2b (TOOL-3, 25 Oct 2026): likes, comments, reactions,
 * follows and read totals for the demo stories. These read the SQL file only; what it does on a
 * real database (twice, with the rules) is proved by npm run demo:check-2b.
 * Proves: the file fits in the SQL Editor in one go; it is one transaction behind both guards
 * (the seed personas, so never production, and part 2a); it creates no accounts and writes no
 * address; it only adds rows (no update, delete or truncate); and its Romanian uses ș and ț.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { maximumPartBytes } from './demo-content-parts';

/** The top-up, as committed. */
const topUpSql = readFileSync(
  fileURLToPath(new URL('../supabase/staging-topups/demo-content-2b.sql', import.meta.url)),
  'utf8',
);

/** The SQL without its comments, so a rule named in a comment can't satisfy or break a test. */
const statementsOnly = topUpSql
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n');

describe('demo content top-up part 2b', () => {
  it('fits in the SQL Editor as one file, under the same limit as the 2a parts', () => {
    expect(Buffer.byteLength(topUpSql)).toBeLessThan(maximumPartBytes);
  });

  it('is one transaction that starts with both guards', () => {
    expect(statementsOnly.match(/^begin;$/gm)).toHaveLength(1);
    expect(statementsOnly.match(/^commit;$/gm)).toHaveLength(1);
    const guards = statementsOnly.indexOf('the 16 seed personas are missing');
    const needsPartA = statementsOnly.indexOf('Run part 2a first');
    const firstInsert = statementsOnly.indexOf('insert into');
    expect(guards).toBeGreaterThan(statementsOnly.indexOf('begin;'));
    expect(needsPartA).toBeGreaterThan(guards);
    expect(firstInsert).toBeGreaterThan(needsPartA);
  });

  it('creates no accounts and holds no email address', () => {
    expect(statementsOnly).not.toMatch(/insert into (auth\.|public\.profiles)/);
    expect(topUpSql).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('only adds rows, and skips any that are already there', () => {
    expect(statementsOnly).not.toMatch(/^\s*(update|delete|truncate)\b/im);
    const inserts = statementsOnly.match(/insert into public\.\w+/g) ?? [];
    const skips = statementsOnly.match(/on conflict \([\w, ]+\) do nothing/g) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    expect(skips).toHaveLength(inserts.length);
  });

  it('writes Romanian with ș and ț (comma below), never the cedilla forms', () => {
    expect(topUpSql).not.toMatch(/[şţŞŢ]/);
    expect(topUpSql).toMatch(/[șț]/);
  });
});
