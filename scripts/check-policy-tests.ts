/**
 * Checks that every row-level security policy has an "allowed" and a "denied" database test
 * (story S1-E1-02; CLAUDE.md rule 1: "Every policy gets an allowed and a denied pgTAP test").
 *
 * Who runs it: scripts/check-policy-tests.test.ts, inside `npm test`, so CI runs it on every
 * pull request.
 * What it reads: every migration in supabase/migrations/ (in order) to find the policies that
 * exist after all of them run, and every test in supabase/tests/ to find the markers.
 * The convention (supabase/README.md): a pgTAP test's description contains
 * "allowed: <policy_name>" or "denied: <policy_name>". Policy names are unique across the
 * database (they start with the table name), so a name alone identifies a policy.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A policy created or dropped in a migration: "create policy name" or "drop policy [if exists] name". */
const policyStatement = /\b(create|drop)\s+policy\s+(?:if\s+exists\s+)?"?([a-z0-9_]+)"?/gi;

/** A test marker in a pgTAP description, for example "allowed: profiles_select_own". */
const testMarker = /\b(allowed|denied):\s*([a-z0-9_]+)/gi;

/** What the tests say about one policy. */
export interface PolicyCoverage {
  policyName: string;
  hasAllowedTest: boolean;
  hasDeniedTest: boolean;
}

/**
 * Works out which policies exist after all migrations run, in order.
 *
 * @param migrationTexts - the contents of each migration, oldest first
 * @returns the names of the policies still in place
 */
export function findLivePolicies(migrationTexts: string[]): Set<string> {
  const livePolicies = new Set<string>();

  for (const migrationText of migrationTexts) {
    // Each "create policy" adds a name; each "drop policy" removes it again.
    for (const match of migrationText.matchAll(policyStatement)) {
      const statementKind = match[1]?.toLowerCase();
      const policyName = match[2]?.toLowerCase();
      if (policyName === undefined) continue;
      if (statementKind === 'create') livePolicies.add(policyName);
      if (statementKind === 'drop') livePolicies.delete(policyName);
    }
  }

  return livePolicies;
}

/**
 * Collects the allowed and denied markers found in the database tests.
 *
 * @param testTexts - the contents of each test file
 * @returns two sets of policy names: those with an allowed test and those with a denied test
 */
export function findTestMarkers(testTexts: string[]): {
  allowed: Set<string>;
  denied: Set<string>;
} {
  const allowed = new Set<string>();
  const denied = new Set<string>();

  for (const testText of testTexts) {
    for (const match of testText.matchAll(testMarker)) {
      const markerKind = match[1]?.toLowerCase();
      const policyName = match[2]?.toLowerCase();
      if (policyName === undefined) continue;
      if (markerKind === 'allowed') allowed.add(policyName);
      if (markerKind === 'denied') denied.add(policyName);
    }
  }

  return { allowed, denied };
}

/**
 * Lists every live policy with whether it has each kind of test.
 *
 * @param migrationTexts - migrations, oldest first
 * @param testTexts - database test files
 * @returns one entry per live policy, sorted by name
 */
export function checkPolicyCoverage(
  migrationTexts: string[],
  testTexts: string[],
): PolicyCoverage[] {
  const markers = findTestMarkers(testTexts);

  return [...findLivePolicies(migrationTexts)].sort().map((policyName) => ({
    policyName,
    hasAllowedTest: markers.allowed.has(policyName),
    hasDeniedTest: markers.denied.has(policyName),
  }));
}

/**
 * Reads every .sql file in a folder and its subfolders, sorted by path (migrations sort by time).
 *
 * @param folder - absolute path
 * @returns each file's contents, in path order
 */
export function readSqlFiles(folder: string): string[] {
  const entries = readdirSync(folder, { withFileTypes: true, recursive: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
    .map((filePath) => readFileSync(filePath, 'utf8'));
}
