/**
 * The "READ ME FIRST" guide at the top of the Download my data ZIP (bundle IDEAS-2, part a; idea
 * IDEA-20261101-1; GDPR art. 12(1): information about a person's data in an intelligible form).
 *
 * A plain-text page in the person's language that says what each file and folder in the ZIP holds,
 * what each part of data.json is and, one line each, what every group under "tables" is. The
 * lines come from the dataExport locale files (guide.*), so staff can reword them like any
 * interface text (S1-E11-18). exportGuideCoverage.test.ts fails the checks when a table joins the
 * export without its line.
 * Who calls it: makeDataExport() in runDataExport.ts and runDataRequestCopy() for a staff copy.
 * What it calls: nothing outside this file.
 */
import type { ZipEntry } from './buildExportZip';
import { LIBRARY_FILE_NAME } from './libraryForExport';

/** The guide's words, already translated into the person's language. */
export interface ExportGuideWords {
  /** The guide's own name inside the ZIP, such as "READ ME FIRST.txt". */
  fileName: string;
  title: string;
  /** The opening paragraph, with the date the copy was made already filled in. */
  intro: string;
  filesHeading: string;
  files: { data: string; stories: string; plans: string; library: string };
  partsHeading: string;
  parts: { format: string; user_id: string; account: string; library: string; tables: string };
  tablesHeading: string;
  /** One table's line, or null when there is none (the checks stop that from shipping). */
  tableLine: (tableName: string) => string | null;
  /** Said after a group that holds nothing for this person. */
  empty: string;
  /** The closing line with the contact address. */
  help: string;
}

/** The guide as it goes in the ZIP: its name and its text (JSZip writes text as UTF-8). */
export interface GuideFile {
  fileName: string;
  text: string;
}

/** What the guide needs to know about the copy it describes. */
export interface ExportGuideContents {
  /** data.json's "tables" part: each group's rows, by table name. */
  tables: Record<string, unknown>;
  /** Every other file in the ZIP, to say which kinds are there. */
  files: ZipEntry[];
}

/** A plan's file name ends like this (buildPlanFiles() in runDataExport.ts). */
const PLAN_FILE = /-plan\.(docx|pdf)$/;

/**
 * The lines about the files and folders, only for the kinds the ZIP holds.
 *
 * @returns one bullet line per kind of file
 */
function fileLines(contents: ExportGuideContents, words: ExportGuideWords): string[] {
  const names = contents.files.map((file) => file.fileName);
  // Step 1: data.json is always there.
  const lines = [words.files.data];
  // Step 2: the stories folder, the plans and the library spreadsheet, when there are any.
  const isStory = (name: string) => name.startsWith('stories/') && !PLAN_FILE.test(name);
  if (names.some(isStory)) lines.push(words.files.stories);
  if (names.some((name) => PLAN_FILE.test(name))) lines.push(words.files.plans);
  if (names.includes(LIBRARY_FILE_NAME)) lines.push(words.files.library);
  return lines.map((line) => `- ${line}`);
}

/**
 * One line per group under "tables", in the order data.json lists them. A group with no rows for
 * this person says so, so nobody hunts for something that isn't there.
 *
 * @returns one bullet line per group
 */
function tableLines(contents: ExportGuideContents, words: ExportGuideWords): string[] {
  return Object.entries(contents.tables).map(([tableName, rows]) => {
    const isEmpty = Array.isArray(rows) && rows.length === 0;
    // A missing line falls back to the group's name alone; the checks keep that from shipping.
    const line = words.tableLine(tableName) ?? '';
    const description = line === '' ? tableName : `${tableName}: ${line}`;
    return `- ${isEmpty ? `${description} ${words.empty}` : description}`;
  });
}

/**
 * Writes the guide.
 *
 * @param contents - data.json's tables and the ZIP's other files
 * @param words - the guide's words in the person's language
 * @returns the guide as a file for the ZIP; JSZip writes it in UTF-8, so ș and ț stay ș and ț
 */
export function exportGuideFile(contents: ExportGuideContents, words: ExportGuideWords): GuideFile {
  const parts = words.parts;
  const sections = [
    // Step 1: the title and what the copy is.
    [words.title, '', words.intro],
    // Step 2: the files and folders that are in this ZIP.
    [words.filesHeading, '', ...fileLines(contents, words)],
    // Step 3: the parts of data.json.
    [
      words.partsHeading,
      '',
      ...[parts.format, parts.user_id, parts.account, parts.library, parts.tables].map(
        (line) => `- ${line}`,
      ),
    ],
    // Step 4: every group under "tables", then where to ask.
    [words.tablesHeading, '', ...tableLines(contents, words)],
    [words.help],
  ];
  const text = `${sections.map((lines) => lines.join('\n')).join('\n\n')}\n`;
  return { fileName: words.fileName, text };
}
