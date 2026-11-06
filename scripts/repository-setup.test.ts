/**
 * Checks the repository settings that hosting and CI depend on (story S1-E1-01).
 * Each test names the decision it protects, so a change that breaks one is easy to trace.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Reads a file from the repository root.
 *
 * @param relativePath - path from the repository root
 * @returns the file's text
 */
function readRepositoryFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8');
}

describe('repository setup', () => {
  it('pins Node.js 24 in .nvmrc and package.json (decided 17 Oct 2026, 13:18)', () => {
    const packageJson = JSON.parse(readRepositoryFile('package.json')) as {
      engines?: { node?: string };
    };

    expect(readRepositoryFile('.nvmrc').trim()).toBe('24');
    expect(packageJson.engines?.node).toBe('>=24 <25');
  });

  it('uses the Node version from .nvmrc in every GitHub Actions job that sets up Node', () => {
    const workflows = ['ci.yml', 'release-production.yml', 'sync-story-issues.yml'].map((name) =>
      readRepositoryFile(`.github/workflows/${name}`),
    );

    for (const workflow of workflows) {
      const setupNodeSteps = workflow.match(/uses: actions\/setup-node@/g) ?? [];
      const nvmrcSettings = workflow.match(/node-version-file: \.nvmrc/g) ?? [];
      expect(nvmrcSettings.length).toBe(setupNodeSteps.length);
    }
  });

  it('sends every address to index.html on Cloudflare Pages, so reloading any page works', () => {
    expect(readRepositoryFile('public/_redirects').trim()).toBe('/* /index.html 200');
  });

  it('has no GitHub Actions job that deploys staging or pushes migrations (Cloudflare and Supabase integrations do that)', () => {
    const ciWorkflow = readRepositoryFile('.github/workflows/ci.yml');

    expect(ciWorkflow).not.toMatch(/supabase db push|wrangler|pages deploy/);
  });

  it('never filters the CI workflow by paths or branches on pull requests, which would leave required checks pending', () => {
    // GitHub docs, "Skip workflow runs": a workflow skipped by path or branch filtering leaves its
    // checks "Pending" and blocks the merge. Skip single jobs with `if:` instead (24 Oct 2026).
    const ciWorkflow = readRepositoryFile('.github/workflows/ci.yml');

    expect(ciWorkflow).not.toMatch(/^\s*(paths|paths-ignore|branches-ignore):/m);
    expect(ciWorkflow).not.toMatch(/^ {2}pull_request:\n(?:\s+#.*\n)*\s+branches:/m);
  });

  it('runs the database and e2e jobs only on main, after the merge, and only the quick checks on pull requests', () => {
    // Robert, 1 Nov 2026: the full tests run locally before the merge and in CI after it
    // (replaces "run the long CI jobs only when they matter", 24 Oct 2026).
    const ciWorkflow = readRepositoryFile('.github/workflows/ci.yml');
    const gate = 'needs: [checks]\n';
    const condition = `if: "!cancelled() && github.event_name == 'push'"`;

    expect(ciWorkflow).toContain('types: [opened, synchronize, reopened, ready_for_review]');
    expect(ciWorkflow.split(gate)).toHaveLength(3);
    expect(ciWorkflow.split(condition)).toHaveLength(3);
    expect(ciWorkflow).not.toContain('only-docs-changed');
  });

  it('has a code tour that covers where the app starts, how a click travels, where things live and where to start reading', () => {
    const codeTour = readRepositoryFile('docs/code-tour.md');

    expect(codeTour).toMatch(/^## Where the app starts$/m);
    expect(codeTour).toMatch(/^## How a click travels$/m);
    expect(codeTour).toMatch(/^## Where things live$/m);
    expect(codeTour).toMatch(/^## Start here\b/m);
  });
});
