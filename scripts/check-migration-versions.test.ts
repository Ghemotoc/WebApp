/**
 * Tests for the migration version check (tooling, 24 Oct 2026).
 * Proves the real supabase/migrations folder has no clash, and that the check catches a version
 * used twice and a badly named file, and (QA-4) that a new migration must come after main's newest
 * and be a real moment; also that new-migration.ts picks such a version.
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  findMigrationOrderProblems,
  findMigrationVersionProblems,
  versionToDate,
} from './check-migration-versions';
import { nextMigrationVersion } from './new-migration';

const migrationsFolder = fileURLToPath(new URL('../supabase/migrations', import.meta.url));

describe('the migration version check', () => {
  it('finds no version used twice in supabase/migrations', () => {
    // On failure the list names each clashing version and its files.
    expect(findMigrationVersionProblems(readdirSync(migrationsFolder))).toEqual([]);
  });

  it('catches two migrations from different stories with the same version', () => {
    const problems = findMigrationVersionProblems([
      '20261023100001_s1_e3_01_categories_and_tags.sql',
      '20261023100001_s1_e11_01_admin_shell.sql',
      '20261023100002_s1_e3_01_stories.sql',
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('version 20261023100001');
    expect(problems[0]).toContain('20261023100001_s1_e11_01_admin_shell.sql');
    expect(problems[0]).toContain('20261023100001_s1_e3_01_categories_and_tags.sql');
  });

  it('catches a migration without a 14-digit version and ignores files that are not SQL', () => {
    const problems = findMigrationVersionProblems([
      '2026102310_s1_e3_01_short.sql',
      'README.md',
      '20261023100002_s1_e3_01_stories.sql',
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('2026102310_s1_e3_01_short.sql');
  });

  it('refuses a new migration dated before the newest one on main (QA-4)', () => {
    const onMain = ['20261023100001_s1_e3_01_tags.sql', '20270131100003_qa2_c_policies.sql'];
    const problems = findMigrationOrderProblems(onMain, [
      ...onMain,
      '20261105120000_s1_e3_14_notes.sql',
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('20261105120000_s1_e3_14_notes.sql');
    expect(problems[0]).toContain('20270131100003');
  });

  it('accepts a later new migration and the old files on main, impossible hours included', () => {
    const onMain = ['20261017250002_s1_e1_02_old.sql', '20270131100003_qa2_c_policies.sql'];

    expect(findMigrationOrderProblems(onMain, [...onMain, '20270131100004_qa4_next.sql'])).toEqual(
      [],
    );
  });

  it('refuses a new migration whose version is no real moment', () => {
    const problems = findMigrationOrderProblems(
      ['20270131100003_qa2_c_policies.sql'],
      ['20270131100003_qa2_c_policies.sql', '20270131250000_qa4_bad_hour.sql'],
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('not a real date and time');
    expect(versionToDate('20270230100000')).toBeNull();
    expect(versionToDate('20270131100003')?.toISOString()).toBe('2027-01-31T10:00:03.000Z');
  });

  it('migration:new takes the newest version plus one second when that is later than now', () => {
    const now = new Date('2026-11-05T22:00:00Z');

    expect(nextMigrationVersion(['20270131235959_qa2_c.sql', '20261017250002_old.sql'], now)).toBe(
      '20270201000000',
    );
    expect(nextMigrationVersion(['20261001100000_old.sql'], now)).toBe('20261105220000');
  });

  it('the folder passes when main holds the same files', () => {
    // Only files main lacks are checked for order, so today's folder passes on main itself.
    expect(
      findMigrationOrderProblems(readdirSync(migrationsFolder), readdirSync(migrationsFolder)),
    ).toEqual([]);
  });
});
