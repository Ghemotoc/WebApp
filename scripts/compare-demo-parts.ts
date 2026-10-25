/**
 * Proves the split demo top-up adds exactly the same rows as the single file (Lane B; CTO,
 * 24 Oct 2026). `npm run demo:compare-parts` runs it; it needs the local Supabase (Docker).
 *
 * What it does, all on the LOCAL database only:
 *   1. resets it (npx supabase db reset: migrations and seed, nothing else), runs the single file
 *      supabase/staging-topups/demo-content-2a.sql and takes a snapshot;
 *   2. resets it again, runs the parts in order (and then all of them a second time, to prove
 *      each is safe to run twice) and takes the same snapshot;
 *   3. compares the two and resets once more, so the local database is left clean (the seed-
 *      personas test expects no extra accounts).
 * The snapshot: row counts for everything the top-up adds, and md5 checksums of every chapter
 * body, title and word count, every story's blurb, slug and rating, and every story's tags.
 * Exit code 1 when anything differs, with the two snapshots printed.
 * Who calls it: you, after `npm run demo:build` changes the parts (see the staging-topups README).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { topUpPartsFolder, topUpPath } from './build-demo-content';

/** Counts and checksums of everything the top-up writes, as one JSON row. */
const snapshotQuery = `
select json_build_object(
  'test_accounts', (select count(*) from auth.users where email like '%@personas.test'),
  'demo_writers', (select count(*) from public.profiles where id::text like '00000000-0000-4000-8000-0000000001__'),
  'settings', (select count(*) from public.settings where key like 'classics_account_%'),
  'stories', (select count(*) from public.stories where slug like '%-demo-__' or slug like '%-classic'),
  'chapters', (select count(*) from public.chapters where code like 'd___c___' or code like 'k___c___'),
  'story_tags', (select count(*) from public.story_tags join public.stories on stories.id = story_tags.story_id
                 where slug like '%-demo-__' or slug like '%-classic'),
  'chapter_checksum', (select md5(string_agg(code || '|' || published_title || '|' || published_body || '|' ||
                         draft_body || '|' || word_count || '|' || coalesce(published_word_count, -1), '#' order by code))
                       from public.chapters where code like 'd___c___' or code like 'k___c___'),
  'story_checksum', (select md5(string_agg(slug || '|' || title || '|' || blurb || '|' || rating || '|' || cover_kind, '#' order by slug))
                     from public.stories where slug like '%-demo-__' or slug like '%-classic'),
  'tag_checksum', (select md5(string_agg(stories.slug || '|' || tags.normalised_name, '#' order by stories.slug, tags.normalised_name))
                   from public.story_tags join public.stories on stories.id = story_tags.story_id
                   join public.tags on tags.id = story_tags.tag_id
                   where slug like '%-demo-__' or slug like '%-classic')
)::text;`;

/**
 * The local database's address, from the Supabase CLI. Refuses anything that isn't on this
 * machine, so the comparison can never touch staging or production.
 *
 * @returns the connection string
 * Errors: throws when the local stack isn't running or the address isn't local.
 */
export function localDatabaseUrl(): string {
  const status = JSON.parse(
    execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' }),
  ) as {
    DB_URL?: string;
  };
  const url = status.DB_URL ?? '';
  if (!/^postgresql:\/\/[^@]+@(127\.0\.0\.1|localhost):/.test(url)) {
    throw new Error(`Refusing to run: "${url}" is not the local database.`);
  }
  return url;
}

/** Resets the local database to its migrations and seed. */
export function resetLocalDatabase(): void {
  execFileSync('npx', ['supabase', 'db', 'reset'], { stdio: 'ignore' });
}

/**
 * Runs one SQL file with psql, stopping at the first error.
 *
 * @param databaseUrl - the local database
 * @param filePath - the file to run
 */
export function runSqlFile(databaseUrl: string, filePath: string): void {
  execFileSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-q', '-f', filePath], {
    stdio: 'ignore',
  });
}

/**
 * Takes the snapshot.
 *
 * @param databaseUrl - the local database
 * @returns the snapshot as parsed JSON
 */
function snapshot(databaseUrl: string): Record<string, unknown> {
  const output = execFileSync('psql', [databaseUrl, '-At', '-c', snapshotQuery], {
    encoding: 'utf8',
  });
  return JSON.parse(output.trim()) as Record<string, unknown>;
}

/**
 * The part files, in run order.
 *
 * @returns their paths
 */
export function partFiles(): string[] {
  return readdirSync(topUpPartsFolder)
    .filter((name) => /^part-\d+\.sql$/.test(name))
    .sort()
    .map((name) => join(topUpPartsFolder, name));
}

/**
 * Runs the comparison and reports.
 *
 * @returns true when both give the same rows
 */
export function compareSingleFileWithParts(): boolean {
  const databaseUrl = localDatabaseUrl();
  const parts = partFiles();

  // 1. The single file on a fresh database.
  resetLocalDatabase();
  runSqlFile(databaseUrl, topUpPath);
  const fromSingleFile = snapshot(databaseUrl);

  // 2. The parts on a fresh database, then all of them again (each must be safe to run twice).
  resetLocalDatabase();
  for (const part of parts) runSqlFile(databaseUrl, part);
  const fromParts = snapshot(databaseUrl);
  for (const part of parts) runSqlFile(databaseUrl, part);
  const fromPartsTwice = snapshot(databaseUrl);

  // 3. Leave the local database clean for the other tests.
  resetLocalDatabase();

  const same = JSON.stringify(fromSingleFile) === JSON.stringify(fromParts);
  const twiceSame = JSON.stringify(fromParts) === JSON.stringify(fromPartsTwice);
  console.log(`single file:      ${JSON.stringify(fromSingleFile)}`);
  console.log(`${parts.length} parts:          ${JSON.stringify(fromParts)}`);
  console.log(`parts run twice:  ${twiceSame ? 'no change' : JSON.stringify(fromPartsTwice)}`);
  console.log(same && twiceSame ? 'Same rows from both.' : 'DIFFERENT: see above.');
  return same && twiceSame;
}

// Run only when started from the command line.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = compareSingleFileWithParts() ? 0 : 1;
}
