/**
 * The reader's library shelves in Download my data: full links in the data file, and a copy as a
 * spreadsheet, library.csv (bundle IDEAS-1, part f; idea IDEA-20261031-12; GDPR art. 15 and 20).
 *
 * The database answers each shelf entry with the story's address on the website ("/s/<story>"),
 * or none when the reader can no longer open it (my_data_export(), "library"). The website's
 * address is a setting of the front end (src/config/brand.ts), so the full links are made here.
 * Who calls it: makeDataExport() in runDataExport.ts. What it calls: nothing outside this file.
 */
import type { DataExportDocument, ExportedLibraryEntry } from '../api/dataExport';

import type { ZipEntry } from './buildExportZip';

/** The spreadsheet's name inside the ZIP. */
export const LIBRARY_FILE_NAME = 'library.csv';

/** Put first, so a spreadsheet reads the file as UTF-8. */
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/** The spreadsheet's words, in the reader's language. */
export interface LibraryCsvLabels {
  shelf: string;
  title: string;
  writer: string;
  link: string;
  added: string;
  /** Each shelf's name, as the Library shows it. */
  shelves: Record<ExportedLibraryEntry['shelf'], string>;
}

/**
 * The data file with a full link beside each shelf entry's address.
 *
 * @param document - my_data_export()'s answer
 * @param siteUrl - the website, such as "https://example.com" (brand.siteUrl)
 * @returns the same document, its library entries with `link` (null when there is no address)
 */
export function withLibraryLinks(
  document: DataExportDocument,
  siteUrl: string,
): DataExportDocument {
  const library = (document.library ?? []).map((entry) => ({
    ...entry,
    link: entry.path === null ? null : `${siteUrl}${entry.path}`,
  }));
  return { ...document, library };
}

/**
 * One spreadsheet cell, quoted when it holds a comma, a quote or a line break (RFC 4180).
 *
 * @param value - the cell's text
 * @returns the text as it goes in the file
 */
function csvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

/**
 * The shelves as a spreadsheet: one line per story, with a heading line first.
 *
 * @param document - the data file, after withLibraryLinks()
 * @param labels - the column names and shelf names in the reader's language
 * @returns the file for the ZIP, or null when the library is empty
 */
export function libraryCsvFile(
  document: DataExportDocument,
  labels: LibraryCsvLabels,
): ZipEntry | null {
  const entries = document.library ?? [];
  if (entries.length === 0) return null;
  // Step 1: the heading line, then one line per story; the date is the day it was shelved.
  const lines = [[labels.shelf, labels.title, labels.writer, labels.link, labels.added]];
  for (const entry of entries) {
    lines.push([
      labels.shelves[entry.shelf],
      entry.title,
      entry.writer,
      entry.link ?? '',
      entry.added_at.slice(0, 10),
    ]);
  }
  // Step 2: commas between cells, CRLF between lines, and a byte-order mark first, so a
  // spreadsheet opens it as UTF-8 and ș and ț stay ș and ț.
  const text = `${BYTE_ORDER_MARK}${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}\r\n`;
  // Copied into this page's own Uint8Array: the ZIP library checks the type by its constructor.
  return { fileName: LIBRARY_FILE_NAME, bytes: new Uint8Array(new TextEncoder().encode(text)) };
}
