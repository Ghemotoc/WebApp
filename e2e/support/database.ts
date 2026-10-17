/**
 * Runs SQL against the local Supabase database for test set-up and clean-up (story S1-E14-01).
 *
 * Who calls it: end-to-end tests that need a state the app can't reach on its own yet, for
 * example a new important version of the terms (only migrations publish versions).
 * How: psql inside the local database container (`supabase_db_<project_id>`, project_id from
 * supabase/config.toml). No service role key is used anywhere, so none can leak into the app
 * (CLAUDE.md rule 2). Local and CI only; never point this at staging or production.
 */
import { execFileSync } from 'node:child_process';

/** The local database container's name (supabase/config.toml: project_id = "webapp"). */
const databaseContainer = 'supabase_db_webapp';

/**
 * Runs SQL as the database owner and returns what it printed.
 *
 * @param sql - one or more statements
 * @returns psql's output, trimmed (for example a single value from "select …")
 * Errors: throws with psql's message when a statement fails, so the test stops at set-up.
 */
export function runSql(sql: string): string {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      databaseContainer,
      'psql',
      '-U',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
      '-c',
      sql,
    ],
    { encoding: 'utf8' },
  ).trim();
}
