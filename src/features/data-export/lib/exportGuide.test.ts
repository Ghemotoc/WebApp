/**
 * Tests for the "READ ME FIRST" guide (bundle IDEAS-2, part a; idea IDEA-20261101-1).
 *
 * What it proves:
 * - criterion 1: the guide lists the files the ZIP holds and every group under "tables", in the
 *   person's language, and says when a group is empty;
 * - criterion 2: every table the database puts in the export has a line in both languages, so a
 *   new table can't join the export without one. The tables come from the newest migration that
 *   defines data_export_tables() (the included ones) and export_tables_of() (its extra groups).
 * Who runs it: `npm test`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import enDataExport from '@/locales/en/dataExport.json';
import roDataExport from '@/locales/ro/dataExport.json';

import { exportGuideFile, type ExportGuideWords } from './exportGuide';

/** The migrations folder. */
const migrationsFolder = join(process.cwd(), 'supabase/migrations');

/**
 * The newest migration that (re)defines a function, as text.
 *
 * @param functionName - such as "data_export_tables"
 * @returns the migration's text
 */
function newestDefinition(functionName: string): string {
  const marker = `create or replace function public.${functionName}(`;
  const files = readdirSync(migrationsFolder)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  // Compare in lower case: some migrations write "CREATE OR REPLACE FUNCTION" in capitals, and
  // missing those once made the test read an old list and skip newer tables (INACTIVE-1).
  const defining = files.filter((name) =>
    readFileSync(join(migrationsFolder, name), 'utf8').toLowerCase().includes(marker),
  );
  const newest = defining.at(-1);
  if (newest === undefined) throw new Error(`No migration defines ${functionName}()`);
  const text = readFileSync(join(migrationsFolder, newest), 'utf8');
  return text.slice(text.toLowerCase().indexOf(marker));
}

/** Every group name the export holds under "tables". */
function exportedTableNames(): string[] {
  // The included rows of data_export_tables(): ('<table>', true, null).
  const listed = newestDefinition('data_export_tables').split('$$')[1] ?? '';
  const included = [...listed.matchAll(/\('([a-z_]+)',\s*true,/g)].map((match) => match[1] ?? '');
  // The extra groups export_tables_of() adds by name: jsonb_build_object('<group>', ...).
  const extraBody = newestDefinition('export_tables_of').split('$$')[1] ?? '';
  const extras = [...extraBody.matchAll(/jsonb_build_object\('([a-z_]+)',\s*public\./g)].map(
    (match) => match[1] ?? '',
  );
  return [...included, ...extras];
}

/** Words for the builder tests, with two known table lines. */
const words: ExportGuideWords = {
  fileName: 'READ ME FIRST.txt',
  title: 'Data, explained',
  intro: 'Made on 4 November 2026.',
  filesHeading: 'The files',
  files: { data: 'data.json: all', stories: 'stories/: docs', plans: 'plans', library: 'csv' },
  partsHeading: 'Inside',
  parts: { format: 'f', user_id: 'u', account: 'a', library: 'l', tables: 't' },
  tablesHeading: 'The groups',
  tableLine: (name) => ({ stories: 'Your stories.', comments: 'Your comments.' })[name] ?? null,
  empty: '(empty)',
  help: 'Questions? Write to us.',
};

/** The guide's text for some tables and files. */
function guideText(tables: Record<string, unknown>, fileNames: string[]): string {
  const files = fileNames.map((fileName) => ({ fileName, bytes: new Uint8Array() }));
  return exportGuideFile({ tables, files }, words).text;
}

describe('the READ ME FIRST guide', () => {
  it('lists each file kind the ZIP holds and leaves out the ones it doesn’t', () => {
    const text = guideText({}, ['stories/rain.docx', 'stories/rain.pdf', 'library.csv']);
    expect(text).toContain('- data.json: all');
    expect(text).toContain('- stories/: docs');
    expect(text).toContain('- csv');
    expect(text).not.toContain('- plans');
  });

  it('names a story plan only when there is one', () => {
    expect(guideText({}, ['stories/rain-plan.docx'])).toContain('- plans');
    expect(guideText({}, ['stories/rain-plan.docx'])).not.toContain('stories/: docs');
  });

  it('gives every group under tables its line and says when one is empty', () => {
    const text = guideText({ stories: [{ id: 1 }], comments: [] }, []);
    expect(text).toContain('- stories: Your stories.');
    expect(text).toContain('- comments: Your comments. (empty)');
  });

  it('starts with the title and ends with where to ask', () => {
    const text = guideText({}, []);
    expect(text.startsWith('Data, explained\n\nMade on 4 November 2026.')).toBe(true);
    expect(text.trimEnd().endsWith('Questions? Write to us.')).toBe(true);
  });

  it('keeps ș and ț as they are', () => {
    const romanian = { ...words, title: 'Datele, pe înțeles' };
    const file = exportGuideFile({ tables: {}, files: [] }, romanian);
    expect(file.text).toContain('înțeles');
  });
});

describe('every exported table has a line in the guide', () => {
  const tableNames = exportedTableNames();

  it('finds the export’s tables in the migrations', () => {
    expect(tableNames).toContain('stories');
    expect(tableNames).toContain('support_tickets');
  });

  it.each([
    ['en', enDataExport.guide.tables],
    ['ro', roDataExport.guide.tables],
  ])('in %s, no table is left without its line', (_language, lines) => {
    const missing = tableNames.filter((name) => !(name in lines));
    expect(missing).toEqual([]);
  });
});
