/**
 * Checks scripts/only-docs-changed.sh, which tells CI whether a pull request changes only
 * documentation, so the database and e2e jobs can be skipped ("Tooling: run the long CI jobs only
 * when they matter", 24 Oct 2026).
 *
 * Why it matters: a wrong "true" would let a code change merge without its database and e2e
 * tests, so every test that expects "false" guards against that.
 * How: each test pipes a list of changed paths into the script, as the "changes" job in
 * .github/workflows/ci.yml does, and reads the answer.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(new URL('./only-docs-changed.sh', import.meta.url));

/**
 * Runs the script with the given changed paths, one per line.
 *
 * @param changedPaths - the paths a pull request changes
 * @returns "true" or "false", as the script printed it
 * @throws when bash exits with an error
 */
function onlyDocsChanged(changedPaths: string[]): string {
  return execFileSync('bash', [scriptPath], {
    input: changedPaths.map((path) => `${path}\n`).join(''),
    encoding: 'utf8',
  }).trim();
}

describe('only-docs-changed.sh', () => {
  it('says true for changes only under docs/', () => {
    expect(onlyDocsChanged(['docs/decisions.md', 'docs/runbooks/restore.md'])).toBe('true');
  });

  it('says true for changes only under prompts/, whatever the file type', () => {
    expect(onlyDocsChanged(['prompts/05-session.md', 'prompts/notes.txt'])).toBe('true');
  });

  it('says true for Markdown files anywhere, such as CLAUDE.md and a feature README', () => {
    expect(onlyDocsChanged(['CLAUDE.md', 'src/features/auth/README.md'])).toBe('true');
  });

  it('says false as soon as one file is not documentation', () => {
    expect(onlyDocsChanged(['docs/decisions.md', 'src/main.tsx'])).toBe('false');
  });

  it('says false for a migration, a test, the workflow and a docs look-alike', () => {
    expect(onlyDocsChanged(['supabase/migrations/20261024_s1_e3_04.sql'])).toBe('false');
    expect(onlyDocsChanged(['e2e/sign-in.spec.ts'])).toBe('false');
    expect(onlyDocsChanged(['.github/workflows/ci.yml'])).toBe('false');
    expect(onlyDocsChanged(['src/docs/helper.ts'])).toBe('false');
    expect(onlyDocsChanged(['notes.md.ts'])).toBe('false');
  });

  it('says false for an empty list, so the full suite runs when in doubt', () => {
    expect(onlyDocsChanged([])).toBe('false');
  });
});
