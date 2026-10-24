/**
 * The migration version check behind `npm run migrations:check` (tooling, 24 Oct 2026; the CTO
 * approved it after two sessions gave different migrations the same version number).
 *
 * Who runs it: you, and CI on every pull request (job "checks"). It exits with code 1 when
 * something is wrong. Its unit test (check-migration-versions.test.ts) runs it on the real folder
 * too, so `npm test` catches a clash as well.
 * What it reads: the file names in supabase/migrations/.
 * What it checks: every migration starts with a 14-digit version (`YYYYMMDDHHMMSS_`) and no two
 * migrations share one. Supabase keys applied migrations by that number, so a second file with
 * the same version makes `supabase db reset` and the staging deploy refuse it.
 * Why it matters: parallel sessions name migrations `<timestamp>_<story-id>_<slug>.sql`
 * (CLAUDE.md, Conventions); the story ID keeps the names apart but not the versions.
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** A migration's file name: a 14-digit version, an underscore, a name, `.sql`. */
const migrationFileName = /^(\d{14})_[a-z0-9_]+\.sql$/;

/** One problem the check found, written so a non-developer can act on it. */
export type MigrationProblem = string;

/**
 * Finds badly named migrations and versions used more than once.
 *
 * @param fileNames - the names in supabase/migrations/ (other files are ignored unless .sql)
 * @returns one sentence per problem; empty when every version is unique
 */
export function findMigrationVersionProblems(fileNames: string[]): MigrationProblem[] {
  const problems: MigrationProblem[] = [];
  const filesByVersion = new Map<string, string[]>();

  // Step 1: every .sql file needs a version; collect the files under each version.
  for (const fileName of [...fileNames].sort()) {
    if (!fileName.endsWith('.sql')) continue;
    const match = migrationFileName.exec(fileName);
    if (match === null) {
      problems.push(
        `${fileName}: a migration's name must be <14-digit version>_<story_id>_<slug>.sql, for example 20261024120001_s1_e11_01b_pick_account.sql.`,
      );
      continue;
    }
    const version = match[1];
    filesByVersion.set(version, [...(filesByVersion.get(version) ?? []), fileName]);
  }

  // Step 2: a version used twice is a clash; the later file needs a new, unused number.
  for (const [version, files] of filesByVersion) {
    if (files.length < 2) continue;
    problems.push(
      `version ${version} is used by ${files.join(' and ')}. Supabase keys migrations by this number, so give the newer file an unused one (the same day and a later time keeps the order).`,
    );
  }
  return problems;
}

/** Runs the check from the command line and sets the exit code CI reads. */
function main(): void {
  const migrationsFolder = fileURLToPath(new URL('../supabase/migrations', import.meta.url));
  const problems = findMigrationVersionProblems(readdirSync(migrationsFolder));

  if (problems.length === 0) {
    console.log('Migration check passed: every migration has its own version number.');
    return;
  }
  console.error(`Migration check failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
