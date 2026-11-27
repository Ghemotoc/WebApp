/**
 * Checks that every end-to-end file takes `test` from e2e/support/test.ts, never straight from
 * Playwright (QA, 26 Nov 2026).
 *
 * Why: support/test.ts closes the browser contexts a test leaves open. A spec that imports
 * Playwright's own `test` skips that step, and its leftover signed-in pages slow every later test
 * in the same CI shard until one runs out of time.
 * What it proves: no file in e2e/ other than support/test.ts imports a value named `test` from
 * '@playwright/test' (types such as `type Page` are fine).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** The e2e folder, from this file. */
const e2eFolder = fileURLToPath(new URL('../e2e', import.meta.url));

/**
 * Lists every TypeScript file under a folder.
 *
 * @param folder - the folder to walk
 * @returns the files' paths
 */
function typeScriptFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return typeScriptFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

/**
 * Says whether a file imports the value `test` from Playwright directly.
 *
 * @param text - the file's text
 * @returns true when an import from '@playwright/test' names `test` (not `type test`)
 */
function importsPlaywrightTest(text: string): boolean {
  const imports = text.matchAll(/import \{([^}]*)\} from '@playwright\/test'/g);
  return [...imports].some((found) =>
    (found[1] ?? '').split(',').some((name) => name.trim() === 'test'),
  );
}

describe('end-to-end imports', () => {
  it('every e2e file takes test from support/test.ts, so leftover contexts are closed', () => {
    const offenders = typeScriptFiles(e2eFolder)
      .filter((path) => !path.endsWith(join('support', 'test.ts')))
      .filter((path) => importsPlaywrightTest(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
