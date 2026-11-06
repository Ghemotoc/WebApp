/**
 * Tests for the bundle-size budget (QA-6, finding S4): it follows static imports, finds the
 * chapter reader's files from Vite's table, and ignores files loaded later with import().
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readerFiles, staticClosure, staticImportsOf } from './check-bundle-size';

describe('the bundle-size budget', () => {
  it('reads static imports but not import(), which loads later', () => {
    const chunk = 'import{a as b}from"./shared-1.js";import"./styles-2.js";import(`./Later-3.js`);';

    expect(staticImportsOf(chunk)).toEqual(['shared-1.js', 'styles-2.js']);
  });

  it('follows static imports through several files, once each', () => {
    const folder = mkdtempSync(join(tmpdir(), 'bundle-'));
    writeFileSync(join(folder, 'index-1.js'), 'import"./a-1.js";import"./b-1.js";');
    writeFileSync(join(folder, 'a-1.js'), 'import"./b-1.js";');
    writeFileSync(join(folder, 'b-1.js'), 'import"./a-1.js";import(`./lazy-1.js`);');
    writeFileSync(join(folder, 'lazy-1.js'), '');

    expect([...staticClosure(folder, ['index-1.js'])].sort()).toEqual([
      'a-1.js',
      'b-1.js',
      'index-1.js',
    ]);
  });

  it("finds the chapter reader's chunk and the files Vite preloads with it", () => {
    const entry =
      'const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/Staff-1.js","assets/ChapterReaderPage-9.js","assets/hooks-2.js"])))=>i.map(i=>d[i]);' +
      'lazy:async()=>{await C(async()=>{await import(`./ChapterReaderPage-9.js`)},__vite__mapDeps([1,2]))}';

    expect(readerFiles(entry)).toEqual(['ChapterReaderPage-9.js', 'hooks-2.js']);
    expect(() => readerFiles('no reader here')).toThrow('chapter reader chunk was not found');
  });
});
