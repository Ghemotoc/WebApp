/**
 * Builds and sends a data request's copy, start to finish, in the staff member's browser (bundle
 * ADMIN-2, part c2; story S1-E11-09; ADR 0012: "staff requests build the same ZIP in the staff
 * member's browser from an admin version of my_data_export()").
 *
 * The steps, in this order:
 *   1. admin_data_request_export() answers the person's data file (logged by the database);
 *   2. every story becomes a Word file and a PDF, and every plan the same two, with the same
 *      builders as Download my data, in the person's language (ADMIN-2d: PDF beside Word); the
 *      library becomes library.csv;
 *   3. staff chose one ZIP of everything, or each file on its own (S1-E11-09: "one file per story
 *      or one zip of all");
 *   4. admin_open_data_request_copy() opens one export per file, under random names;
 *   5. each file is uploaded to the private exports bucket;
 *   6. admin_finish_data_request_copy() marks them ready for seven days, logs which files were
 *      sent and tells the person, who downloads them signed in.
 * Who calls it: useDataRequestCopy(), which loads this file (and the Word and ZIP libraries with
 * it) only when a copy is built, so the staff pages stay small; the PDF library loads with the
 * first PDF.
 * What it calls: api/dataRequestCopy.ts and the Download my data builders it reuses.
 */
import { brand } from '@/config/brand';
import {
  DATA_FILE_NAME,
  buildExportZip,
  type ZipEntry,
} from '@/features/data-export/lib/buildExportZip';
import {
  JSON_TYPE,
  PDF_TYPE,
  WORD_TYPE,
  ZIP_TYPE,
  type DataExportDocument,
} from '@/features/data-export/api/dataExport';
import {
  libraryCsvFile,
  withLibraryLinks,
  type LibraryCsvLabels,
} from '@/features/data-export/lib/libraryForExport';
import {
  BOTH_DOCUMENT_KINDS,
  buildPlanFiles,
  buildWordFiles,
  type DataExportRunOptions,
} from '@/features/data-export/lib/runDataExport';
import { wordInputFrom } from '@/features/data-export/lib/storiesForWord';

import {
  fetchDataRequestExport,
  finishDataRequestCopy,
  openDataRequestCopy,
  uploadDataRequestFile,
} from '../api/dataRequestCopy';

/** How staff send the copy: one ZIP of everything, or each file on its own. */
export type DataRequestCopyFormat = 'zip' | 'separate';

/** What a run needs: the Download my data words (in the person's language) and the request. */
export interface DataRequestCopyOptions extends DataExportRunOptions {
  libraryLabels: LibraryCsvLabels;
  requestId: string;
  /** "D-000001", for the ZIP's name. */
  reference: string;
  format: DataRequestCopyFormat;
}

/** The library spreadsheet's media type, for a copy sent file by file. */
const CSV_TYPE = 'text/csv';

/**
 * Every file of the copy before packing: the Word and PDF files, the plans and library.csv.
 *
 * @returns the files, with their paths inside a ZIP ("stories/rain.docx")
 */
async function buildCopyFiles(
  document: DataExportDocument,
  options: DataRequestCopyOptions,
): Promise<ZipEntry[]> {
  const input = wordInputFrom(document, options.statusLabels);
  const taken = new Set<string>();
  const wordFiles = await buildWordFiles(input, options, taken, BOTH_DOCUMENT_KINDS);
  const planFiles = await buildPlanFiles(document, options, taken, BOTH_DOCUMENT_KINDS);
  const libraryFile = libraryCsvFile(document, options.libraryLabels);
  const extraFiles = libraryFile === null ? [] : [libraryFile];
  return [...wordFiles, ...planFiles, ...extraFiles];
}

/**
 * A file's name when it is sent on its own: its name inside the ZIP without the folder, which the
 * database accepts (letters, digits, dots, dashes and underscores, at most 150 before the ending).
 *
 * @param zipPath - "stories/rain.docx"
 * @returns "rain.docx"
 */
export function separateFileName(zipPath: string): string {
  const withoutFolder = zipPath.slice(zipPath.lastIndexOf('/') + 1);
  const dot = withoutFolder.lastIndexOf('.');
  const ending = withoutFolder.slice(dot);
  // Step 1: only the characters the database accepts, starting with a letter or digit.
  const cleanBase = withoutFolder
    .slice(0, dot)
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/^[^A-Za-z0-9]+/, '');
  // Step 2: never longer than the database allows; a name left empty becomes "file".
  const base = cleanBase.slice(0, 120) || 'file';
  return `${base}${ending}`;
}

/**
 * The media type for a file, by its ending.
 *
 * @returns ZIP, Word, PDF, JSON or CSV
 */
export function copyFileType(fileName: string): string {
  if (fileName.endsWith('.docx')) return WORD_TYPE;
  if (fileName.endsWith('.pdf')) return PDF_TYPE;
  if (fileName.endsWith('.json')) return JSON_TYPE;
  if (fileName.endsWith('.csv')) return CSV_TYPE;
  return ZIP_TYPE;
}

/**
 * Packs the files the way staff chose.
 *
 * @returns the files to send, by the name the person will see
 */
async function packCopy(
  document: DataExportDocument,
  files: ZipEntry[],
  options: DataRequestCopyOptions,
): Promise<ZipEntry[]> {
  if (options.format === 'zip') {
    const bytes = await buildExportZip(document, files);
    return [{ fileName: `${options.reference}-copy.zip`, bytes }];
  }
  // Each file on its own: the data file first, then the others without their folder.
  const dataFile: ZipEntry = {
    fileName: DATA_FILE_NAME,
    bytes: new TextEncoder().encode(JSON.stringify(document, null, 2)),
  };
  const separate = files.map((file) => ({ ...file, fileName: separateFileName(file.fileName) }));
  return [dataFile, ...separate];
}

/**
 * Builds and sends the copy, every step in order.
 *
 * @param options - the client, the words in the person's language, the request and the format
 * @returns how many files were sent
 * Errors: throws DataRequestError at the first step that fails (the database's reason, or
 *   no_file when a file couldn't be saved).
 */
export async function makeDataRequestCopy(options: DataRequestCopyOptions): Promise<number> {
  // Step 1: the person's data, with the library's addresses as full links (IDEAS-1f).
  const raw = await fetchDataRequestExport(options.client, options.requestId);
  const document = withLibraryLinks(raw, brand.siteUrl);
  // Steps 2 and 3: the files, built here in the browser, packed as staff chose.
  const files = await packCopy(document, await buildCopyFiles(document, options), options);
  // Step 4: one export per file, under random names.
  const opened = await openDataRequestCopy(
    options.client,
    options.requestId,
    files.map((file) => file.fileName),
  );
  // Step 5: upload each file under its random name.
  for (const target of opened) {
    const file = files.find((built) => built.fileName === target.displayName);
    if (file === undefined) continue;
    await uploadDataRequestFile(
      options.client,
      target.fileName,
      file.bytes,
      copyFileType(file.fileName),
    );
  }
  // Step 6: ready for seven days; the person is told.
  await finishDataRequestCopy(options.client, options.requestId);
  return files.length;
}
