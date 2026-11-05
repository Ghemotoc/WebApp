/**
 * SQL mutation testing: proves the database tests would notice a broken safety rule (QA-3,
 * findings A2 and A3; the independent QA check ran it by hand on 5 Nov 2026).
 *
 * Who runs it: a developer, by hand, after adding or changing tests for a rule in the list:
 *   npx supabase db reset && npx tsx scripts/mutation/run-sql-mutations.ts
 * It is not part of `npm run checks`: each mutant runs the whole database suite (about a minute).
 * What it reads: scripts/mutation/sql-mutations.json, one entry per mutant: the function, a short
 * description and the text swaps that break it (for example "<= birth_month" becomes "< birth_month").
 * What it does, for each mutant: reads the function's live definition from the local database,
 * applies the swaps, replaces the function, runs `npx supabase test db`, records whether any test
 * failed ("killed", which is what we want) and always puts the original definition back.
 * A mutant that survives is a rule no test checks: write the test (as 296 does for the ranking).
 * It touches only the local Supabase database. Writes the results to
 * scripts/mutation/results.json (not committed).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** One mutant from sql-mutations.json. */
interface Mutation {
  id: string;
  fn: string;
  desc: string;
  subs: [string, string][];
}

/** What happened to one mutant. */
interface MutationResult {
  id: string;
  desc: string;
  outcome: 'killed' | 'survived' | 'not applied';
  detail: string;
}

/** The local database, as the Supabase CLI starts it. */
const psqlArguments = ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-At'];
const psqlEnvironment = { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? 'postgres' };

/**
 * Runs SQL on the local database.
 *
 * @param input - the SQL, sent on standard input
 * @returns what psql printed
 * @throws when psql reports an error
 */
function runSql(input: string): string {
  const answer = spawnSync('psql', [...psqlArguments, '-v', 'ON_ERROR_STOP=1'], {
    input,
    encoding: 'utf8',
    env: psqlEnvironment,
  });
  if (answer.status !== 0) throw new Error(answer.stderr.trim());
  return answer.stdout;
}

/** The live definition of a function, as `create or replace function …`. */
function liveDefinition(functionSignature: string): string {
  return runSql(`select pg_get_functiondef('${functionSignature}'::regprocedure);`);
}

/** Runs the whole database suite; true when every test passed. */
function databaseSuitePasses(): boolean {
  const answer = spawnSync('npx', ['supabase', 'test', 'db'], {
    encoding: 'utf8',
    env: psqlEnvironment,
  });
  return answer.status === 0;
}

/**
 * Applies one mutant, runs the suite and restores the function.
 *
 * @param mutation - the mutant
 * @returns its outcome
 */
function tryMutation(mutation: Mutation): MutationResult {
  const original = liveDefinition(mutation.fn);
  // Step 1: the swaps; a pattern that isn't there means the function changed since the list.
  let mutated = original;
  for (const [before, after] of mutation.subs) {
    if (!mutated.includes(before)) {
      return {
        id: mutation.id,
        desc: mutation.desc,
        outcome: 'not applied',
        detail: `not found: ${before}`,
      };
    }
    mutated = mutated.replace(before, after);
  }
  // Step 2: run the suite against the broken function, then always put the original back.
  try {
    runSql(`${mutated};`);
    const passes = databaseSuitePasses();
    return {
      id: mutation.id,
      desc: mutation.desc,
      outcome: passes ? 'survived' : 'killed',
      detail: '',
    };
  } finally {
    runSql(`${original};`);
  }
}

/** Runs every mutant and prints a line for each. */
function main(): void {
  const listPath = fileURLToPath(new URL('./sql-mutations.json', import.meta.url));
  const mutations = JSON.parse(readFileSync(listPath, 'utf8')) as Mutation[];
  const results: MutationResult[] = [];
  for (const mutation of mutations) {
    const result = tryMutation(mutation);
    results.push(result);
    console.log(`${result.id} ${result.outcome}: ${result.desc} ${result.detail}`.trim());
  }
  writeFileSync(
    fileURLToPath(new URL('./results.json', import.meta.url)),
    JSON.stringify(results, null, 1),
  );
  const survivors = results.filter((result) => result.outcome === 'survived');
  console.log(`${results.length} mutants, ${survivors.length} survived.`);
  if (survivors.length > 0) process.exitCode = 1;
}

main();
