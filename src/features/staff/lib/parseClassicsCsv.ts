/**
 * Reads a research list of classics (the CSV files in content/classics, research G5) for the
 * staff import (story S1-E11-16, part 16b).
 *
 * Who calls it: components/classics/ClassicsImport.tsx, with the text of the file staff picked.
 * What it calls next: nothing; the rows go to importClassics() (api/classicsImport.ts), and the
 * database checks every value again.
 * The format: a header line, then one work per line; a value with a comma or a quote sits in
 * double quotes, and a quote inside it is written twice ("" ), as spreadsheets save CSV.
 */
import type { ClassicListRow } from '../api/classicsImport';

/** The columns the import needs; the lists' other columns (notes, per-market flags) are ignored. */
export const requiredClassicsColumns = [
  'title',
  'author',
  'author_died',
  'type',
  'language',
  'source_url',
] as const;

/** What reading a file gave: the rows, or the columns it lacks. */
export type ParsedClassicsList =
  { isValid: true; rows: ClassicListRow[] } | { isValid: false; missingColumns: string[] };

/**
 * Splits CSV text into lines of values, keeping commas and line breaks inside quotes.
 *
 * @param text - the file's text
 * @returns one array of values per line, blank lines left out
 */
export function splitCsv(text: string): string[][] {
  const lines: string[][] = [];
  let values: string[] = [];
  let value = '';
  let isQuoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    // Step 1: inside quotes, everything is part of the value except a closing quote; two
    // quotes in a row stand for one.
    if (isQuoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') isQuoted = false;
      else value += character;
      continue;
    }
    // Step 2: outside quotes, a comma ends a value and a line break ends a line.
    if (character === '"') isQuoted = true;
    else if (character === ',') {
      values.push(value);
      value = '';
    } else if (character === '\n') {
      lines.push([...values, value]);
      values = [];
      value = '';
    } else if (character !== '\r') value += character;
  }
  lines.push([...values, value]);
  // Step 3: blank lines (the file's last line break, for one) hold nothing.
  return lines.filter((line) => line.some((cell) => cell.trim() !== ''));
}

/**
 * Reads a research list.
 *
 * @param text - the file's text
 * @returns the rows with the needed columns, or the columns the header lacks
 */
export function parseClassicsCsv(text: string): ParsedClassicsList {
  // Step 1: the header names the columns; a byte-order mark from a spreadsheet is dropped.
  const [header = [], ...lines] = splitCsv(text.replace(/^\uFEFF/, ''));
  const names = header.map((name) => name.trim().toLowerCase());
  const missingColumns = requiredClassicsColumns.filter((column) => !names.includes(column));
  if (missingColumns.length > 0) return { isValid: false, missingColumns };
  // Step 2: each line becomes a row of the needed columns, trimmed.
  const valueOf = (line: string[], column: string) => (line[names.indexOf(column)] ?? '').trim();
  const rows = lines.map((line) => ({
    title: valueOf(line, 'title'),
    author: valueOf(line, 'author'),
    author_died: valueOf(line, 'author_died'),
    type: valueOf(line, 'type'),
    language: valueOf(line, 'language'),
    source_url: valueOf(line, 'source_url'),
  }));
  return { isValid: true, rows };
}
