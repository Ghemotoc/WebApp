/**
 * The event catalogue check (story S1-E15-03, criterion 2): the events in the code and the rows
 * of docs/analytics-events.md must be the same list, and every trackEvent() call in src/ must
 * name a catalogued event. TypeScript already refuses an uncatalogued name; this test also
 * catches a call written around the types and a document left behind.
 * Who runs it: `npm test`, so CI fails the build on any difference.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyticsEventNames } from './catalogue';

/** The event names in the document's table: rows that start with | `name` |. */
function documentedNames(): string[] {
  const text = readFileSync(join(process.cwd(), 'docs/analytics-events.md'), 'utf8');
  return [...text.matchAll(/^\|\s*`([a-z]+(?:_[a-z]+)+)`\s*\|/gm)].map((match) => match[1] ?? '');
}

/** Every .ts and .tsx file under a folder. */
function sourceFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((entry) => {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

/** The event names passed to trackEvent() across src/. */
function calledNames(): string[] {
  return sourceFiles(join(process.cwd(), 'src')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/trackEvent\(\s*'([^']+)'/g)].map(
      (match) => match[1] ?? '',
    ),
  );
}

describe('the analytics event catalogue', () => {
  it('lists the same events in the code and in docs/analytics-events.md', () => {
    expect([...documentedNames()].sort()).toEqual([...analyticsEventNames].sort());
  });

  it('names every event object_action', () => {
    for (const name of analyticsEventNames) expect(name).toMatch(/^[a-z]+(_[a-z]+)+$/);
  });

  it('has no trackEvent() call with an uncatalogued name', () => {
    const catalogued = new Set<string>(analyticsEventNames);
    expect(calledNames().filter((name) => !catalogued.has(name))).toEqual([]);
  });
});
