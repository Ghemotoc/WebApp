/**
 * Tests for the migration version check (tooling, 24 Oct 2026).
 * Proves the real supabase/migrations folder has no clash, and that the check catches a version
 * used twice and a badly named file.
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { findMigrationVersionProblems } from './check-migration-versions';

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
});
