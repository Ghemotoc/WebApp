/**
 * Proves the demo content top-up part 2b (TOOL-3, 25 Oct 2026) keeps its rules on a real
 * database and is safe to run twice. `npm run demo:check-2b` runs it; it needs the local Supabase
 * (Docker) and never touches staging or production (localDatabaseUrl() refuses anything else).
 *
 * What it does, all on the LOCAL database only:
 *   1. resets it, runs part 2a's parts and then part 2b, and counts what 2b added;
 *   2. runs part 2b a second time and counts again: nothing may change;
 *   3. checks the rules (see ruleQueries) and resets once more, so the local database is left
 *      clean for the other tests.
 * Exit code 1 when a count changed or a rule is broken, with what went wrong printed.
 * Who calls it: you, after changing supabase/staging-topups/demo-content-2b.sql.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { localDatabaseUrl, partFiles, resetLocalDatabase, runSqlFile } from './compare-demo-parts';

/** Part 2b. */
const partBPath = fileURLToPath(
  new URL('../supabase/staging-topups/demo-content-2b.sql', import.meta.url),
);

/** Everything part 2b adds, counted on the demo stories and classics only. */
const countsQuery = `
select json_build_object(
  'follows_users', (select count(*) from public.follows_users),
  'follows_stories', (select count(*) from public.follows_stories),
  'chapter_likes', (select count(*) from public.chapter_likes),
  'comments', (select count(*) from public.comments),
  'comment_reactions', (select count(*) from public.comment_reactions),
  'chapter_reads', (select coalesce(sum(total), 0) from public.chapter_reads),
  'notifications', (select count(*) from public.notifications)
)::text;`;

/** The ids of the accounts allowed to act: the active adult test accounts. */
const actorHandles = `('adult_writer', 'teacher', 'blocker', 'ana_cu_harti', 'tudor_farasomn',
  'ilinca_noaptea', 'radu_din_deal', 'sofia_cerneala')`;

/** Each rule, as a query that counts the rows breaking it. Every count must be 0. */
const ruleQueries: Record<string, string> = {
  'only the active adult accounts act (no minor, staff or sanctioned persona)': `
    select count(*) from (
      select user_id from public.chapter_likes union all
      select user_id from public.comments union all
      select user_id from public.comment_reactions union all
      -- The seed's own story follow (teen_17 follows a seed story) isn't part 2b's.
      select follows_stories.user_id from public.follows_stories
      join public.stories on stories.id = follows_stories.story_id
      where stories.slug like '%-demo-__' or stories.slug like '%-classic'
    ) as acts join public.profiles on profiles.id = acts.user_id
    where profiles.handle not in ${actorHandles}`,
  'nobody likes their own chapter': `
    select count(*) from public.chapter_likes
    join public.chapters on chapters.id = chapter_likes.chapter_id
    where chapter_likes.user_id = chapters.user_id`,
  'nothing crosses a block, either way': `
    select count(*) from public.blocks
    join public.follows_users on (follows_users.user_id, follows_users.followed_user_id)
      in ((blocks.user_id, blocks.blocked_user_id), (blocks.blocked_user_id, blocks.user_id))`,
  'no like or comment on a chapter by someone either side blocks': `
    select count(*) from (
      select user_id, chapter_id from public.chapter_likes union all
      select user_id, chapter_id from public.comments
    ) as acts join public.chapters on chapters.id = acts.chapter_id
    join public.blocks on (blocks.user_id, blocks.blocked_user_id)
      in ((acts.user_id, chapters.user_id), (chapters.user_id, acts.user_id))`,
  'comments only where the writer left comments on': `
    select count(*) from public.comments
    join public.chapters on chapters.id = comments.chapter_id
    join public.stories on stories.id = chapters.story_id
    where not stories.comments_enabled`,
  'no line said twice on one chapter': `
    select count(*) from (
      select chapter_id, body from public.comments group by chapter_id, body having count(*) > 1
    ) as repeats`,
  'nothing dated in the future, and no reply before its comment': `
    select (select count(*) from public.comments where created_at > now())
         + (select count(*) from public.comments as replies
            join public.comments as parents on parents.id = replies.parent_comment_id
            where replies.created_at < parents.created_at)`,
  'no read total for today, so live reads on staging are never touched': `
    select count(*) from public.chapter_reads
    where read_on >= (now() at time zone 'Europe/Bucharest')::date`,
};

/**
 * Runs one query and returns its single value as text.
 *
 * @param databaseUrl - the local database
 * @param query - a query returning one row with one column
 * @returns the value
 */
function queryValue(databaseUrl: string, query: string): string {
  return execFileSync('psql', [databaseUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], {
    encoding: 'utf8',
  }).trim();
}

/**
 * The rules that are broken, with how many rows break each.
 *
 * @param databaseUrl - the local database
 * @returns one line per broken rule; empty when all hold
 */
function brokenRules(databaseUrl: string): string[] {
  const broken: string[] = [];
  for (const [rule, query] of Object.entries(ruleQueries)) {
    const count = Number(queryValue(databaseUrl, query));
    if (count !== 0) broken.push(`${rule}: ${count} rows break it`);
  }
  return broken;
}

/**
 * Runs the check and reports.
 *
 * @returns true when part 2b adds nothing on a second run and every rule holds
 */
export function checkPartB(): boolean {
  const databaseUrl = localDatabaseUrl();

  // 1. A fresh database with part 2a, then part 2b once.
  resetLocalDatabase();
  for (const part of partFiles()) runSqlFile(databaseUrl, part);
  const beforePartB = queryValue(databaseUrl, countsQuery);
  runSqlFile(databaseUrl, partBPath);
  const afterOnce = queryValue(databaseUrl, countsQuery);

  // 2. Part 2b again: nothing may change, notifications included.
  runSqlFile(databaseUrl, partBPath);
  const afterTwice = queryValue(databaseUrl, countsQuery);

  // 3. The rules, then leave the local database clean.
  const broken = brokenRules(databaseUrl);
  resetLocalDatabase();

  const twiceSame = afterOnce === afterTwice;
  console.log(`before 2b:      ${beforePartB}`);
  console.log(`after 2b:       ${afterOnce}`);
  console.log(`after 2b again: ${twiceSame ? 'no change' : afterTwice}`);
  for (const line of broken) console.log(`BROKEN: ${line}`);
  console.log(
    twiceSame && broken.length === 0 ? 'Part 2b keeps its rules.' : 'PROBLEMS: see above.',
  );
  return twiceSame && broken.length === 0;
}

// Run only when started from the command line.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = checkPartB() ? 0 : 1;
}
