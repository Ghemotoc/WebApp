/**
 * Tests for the policy coverage check (story S1-E1-02).
 * Proves the acceptance criterion "every policy has at least one allowed and one denied test",
 * on the real migrations and tests, and that the check catches a policy without tests.
 */
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  checkPolicyCoverage,
  findLivePolicies,
  findTestMarkers,
  readSqlFiles,
} from './check-policy-tests';

const migrationsFolder = fileURLToPath(new URL('../supabase/migrations', import.meta.url));
const testsFolder = fileURLToPath(new URL('../supabase/tests', import.meta.url));

describe('the policy coverage check', () => {
  it('finds an allowed and a denied database test for every policy in the migrations', () => {
    const coverage = checkPolicyCoverage(readSqlFiles(migrationsFolder), readSqlFiles(testsFolder));
    const policiesMissingATest = coverage.filter(
      (policy) => !policy.hasAllowedTest || !policy.hasDeniedTest,
    );

    expect(coverage.length).toBeGreaterThan(0);
    // On failure the list names each policy and which test is missing.
    expect(policiesMissingATest).toEqual([]);
  });

  it('counts a policy that a later migration drops as gone', () => {
    const live = findLivePolicies([
      'create policy stories_select_public on public.stories for select using (true);',
      'drop policy if exists stories_select_public on public.stories;',
      'create policy "stories_select_own" on public.stories for select using (true);',
    ]);

    expect([...live]).toEqual(['stories_select_own']);
  });

  it('reads allowed and denied markers from test descriptions', () => {
    const markers = findTestMarkers([
      "select ok(true, 'allowed: stories_select_own: a writer reads their draft');",
      "select ok(true, 'denied: stories_select_own: a reader cannot');",
    ]);

    expect([...markers.allowed]).toEqual(['stories_select_own']);
    expect([...markers.denied]).toEqual(['stories_select_own']);
  });

  it('reports a policy that has an allowed test but no denied test', () => {
    const coverage = checkPolicyCoverage(
      ['create policy stories_select_own on public.stories for select using (true);'],
      ["select ok(true, 'allowed: stories_select_own: a writer reads their draft');"],
    );

    expect(coverage).toEqual([
      { policyName: 'stories_select_own', hasAllowedTest: true, hasDeniedTest: false },
    ]);
  });
});
