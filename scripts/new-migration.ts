/**
 * Creates a new, empty migration with a version that sorts after every existing one (QA-4,
 * finding R1). Use it instead of `npx supabase migration new`.
 *
 * Who runs it: you, `npm run migration:new -- <story_id>_<slug>`, for example
 *   npm run migration:new -- s1_e3_14_story_notes
 * What it reads: the file names in supabase/migrations/.
 * What it writes: supabase/migrations/<version>_<name>.sql with the header every migration has.
 * Why: the migrations' versions run ahead of the calendar (many are dated weeks ahead), so the
 * Supabase CLI's "now" would sort before them. This takes the later of now (UTC) and the newest
 * version plus one second, which `npm run migrations:check` accepts.
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { versionToDate } from './check-migration-versions';

/** A migration name after the version: lower case, digits and underscores. */
const migrationName = /^[a-z0-9_]+$/;

/** A moment as a 14-digit migration version (UTC). */
function dateToVersion(moment: Date): string {
  return moment.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

/**
 * Picks the next migration version.
 *
 * @param fileNames - the names in supabase/migrations/
 * @param now - the current moment
 * @returns the later of now and the newest real version plus one second
 */
export function nextMigrationVersion(fileNames: string[], now: Date): string {
  // Step 1: the newest version that is a real moment (a few old files have impossible hours).
  let newest = now;
  for (const fileName of fileNames) {
    const moment = versionToDate(fileName.slice(0, 14));
    if (moment !== null && moment.getTime() >= newest.getTime()) {
      newest = new Date(moment.getTime() + 1000);
    }
  }
  // Step 2: written back as 14 digits.
  return dateToVersion(newest);
}

/** Creates the file from the command line. */
function main(): void {
  // Step 1: the name, checked so the file name passes migrations:check.
  const name = process.argv[2] ?? '';
  if (!migrationName.test(name)) {
    console.error(
      'Give a name such as s1_e3_14_story_notes: npm run migration:new -- <story_id>_<slug>',
    );
    process.exitCode = 1;
    return;
  }
  // Step 2: the version and the file, never overwriting one that exists.
  const migrationsFolder = fileURLToPath(new URL('../supabase/migrations', import.meta.url));
  const version = nextMigrationVersion(readdirSync(migrationsFolder), new Date());
  const path = `${migrationsFolder}/${version}_${name}.sql`;
  if (existsSync(path)) {
    console.error(`${path} already exists.`);
    process.exitCode = 1;
    return;
  }
  writeFileSync(
    path,
    `-- ${name}: what this migration does and why.\n--\n-- Story: . Who calls it: .\n`,
  );
  console.log(`Created ${path}`);
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
