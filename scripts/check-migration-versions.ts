/**
 * The migration version check behind `npm run migrations:check` (tooling, 24 Oct 2026; the CTO
 * approved it after two sessions gave different migrations the same version number).
 *
 * Who runs it: you, and CI on every pull request (job "checks"). It exits with code 1 when
 * something is wrong. Its unit test (check-migration-versions.test.ts) runs it on the real folder
 * too, so `npm test` catches a clash as well.
 * What it reads: the file names in supabase/migrations/, and the names on main
 * (`git ls-tree origin/main`, or the ref in MIGRATIONS_BASE_REF) to tell which files are new.
 * What it checks: every migration starts with a 14-digit version (`YYYYMMDDHHMMSS_`) and no two
 * migrations share one. Supabase keys applied migrations by that number, so a second file with
 * the same version makes `supabase db reset` and the staging deploy refuse it. A migration that
 * isn't on main yet must also have a real date and time, later than the newest one on main
 * (QA-4, finding R1): versions run ahead of the calendar, so `supabase migration new` would give
 * an older number, which a local reset runs out of order and the staging deploy refuses or skips.
 * `npm run migration:new` picks a good number for you (scripts/new-migration.ts).
 * Why it matters: parallel sessions name migrations `<timestamp>_<story-id>_<slug>.sql`
 * (CLAUDE.md, Conventions); the story ID keeps the names apart but not the versions.
 */
import { execFileSync } from 'node:child_process';
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
    const version = migrationFileName.exec(fileName)?.[1];
    if (version === undefined) {
      problems.push(
        `${fileName}: a migration's name must be <14-digit version>_<story_id>_<slug>.sql, for example 20261024120001_s1_e11_01b_pick_account.sql.`,
      );
      continue;
    }
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

/** The versions of the .sql migrations in a list of file names, in order. */
function versionsOf(fileNames: string[]): Map<string, string> {
  const versionsByFile = new Map<string, string>();
  for (const fileName of [...fileNames].sort()) {
    const version = migrationFileName.exec(fileName)?.[1];
    if (version !== undefined) versionsByFile.set(fileName, version);
  }
  return versionsByFile;
}

/**
 * Turns a 14-digit version into the moment it names (UTC), or null when it is no real moment.
 *
 * @param version - for example 20270131100003
 * @returns the date, or null for an impossible one such as hour 25 or 30 February
 */
export function versionToDate(version: string): Date | null {
  // Step 1: cut the version into its six parts.
  const parts = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(version);
  if (parts === null) return null;
  const [year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0] = parts
    .slice(1)
    .map(Number);
  // Step 2: build the moment; Date quietly rolls hour 25 into the next day, so compare back.
  const moment = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const roundTrip = moment.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return roundTrip === version ? moment : null;
}

/**
 * Finds new migrations (not on main yet) whose version is no real moment or isn't later than
 * the newest migration on main (QA-4, finding R1).
 *
 * @param mainFileNames - the names in supabase/migrations/ on main
 * @param currentFileNames - the names in the folder now
 * @returns one sentence per problem; empty when every new migration comes after main's
 */
export function findMigrationOrderProblems(
  mainFileNames: string[],
  currentFileNames: string[],
): MigrationProblem[] {
  // Step 1: the newest version on main; 14-digit strings sort like the numbers they are.
  const mainVersions = [...versionsOf(mainFileNames).values()].sort();
  const newestOnMain = mainVersions.at(-1) ?? '';
  const mainFiles = new Set(mainFileNames);
  const problems: MigrationProblem[] = [];
  // Step 2: each file that main doesn't have yet.
  for (const [fileName, version] of versionsOf(currentFileNames)) {
    if (mainFiles.has(fileName)) continue;
    if (versionToDate(version) === null) {
      problems.push(
        `${fileName}: ${version} is not a real date and time (YYYYMMDDHHMMSS). Run npm run migration:new -- <name> to get a good one.`,
      );
    } else if (version <= newestOnMain) {
      problems.push(
        `${fileName}: its version must be later than the newest migration on main (${newestOnMain}), or it runs out of order. Run npm run migration:new -- <name> to get a good one.`,
      );
    }
  }
  return problems;
}

/**
 * Reads the migration names on main from git.
 *
 * @returns the names, or null when git or the ref isn't there (a shallow CI checkout)
 */
export function readMainMigrationNames(): string[] | null {
  const baseRef = process.env.MIGRATIONS_BASE_REF ?? 'origin/main';
  try {
    const listing = execFileSync(
      'git',
      ['ls-tree', '--name-only', baseRef, 'supabase/migrations/'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    return listing
      .split('\n')
      .filter((line) => line !== '')
      .map((path) => path.split('/').at(-1) ?? path);
  } catch {
    return null;
  }
}

/** Runs the check from the command line and sets the exit code CI reads. */
function main(): void {
  const migrationsFolder = fileURLToPath(new URL('../supabase/migrations', import.meta.url));
  const currentFileNames = readdirSync(migrationsFolder);
  const problems = findMigrationVersionProblems(currentFileNames);

  // The order check needs main's list; without it (no git, a shallow checkout) say so plainly.
  const mainFileNames = readMainMigrationNames();
  if (mainFileNames === null) {
    console.log(
      'Migration order not checked: main is not available here (set MIGRATIONS_BASE_REF).',
    );
  } else {
    problems.push(...findMigrationOrderProblems(mainFileNames, currentFileNames));
  }

  if (problems.length === 0) {
    console.log('Migration check passed: every migration has its own version number, in order.');
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
