/**
 * Makes one copy of the signed-in person's data, start to finish (story S1-E13-02; ADR 0012).
 *
 * The steps, in this order:
 *   1. request_data_export() opens a copy under a random file name;
 *   2. my_data_export() answers the data file, and the library's addresses become full links;
 *   3. the chapter pictures are loaded and drawn as PNG (pictureForWord());
 *   4. every story becomes a Word file through the shared Word builder (src/lib/word/) and a PDF
 *      through the shared PDF builder (src/lib/pdf/; ADMIN-2d, Robert, 2 Nov 2026), and its plan
 *      from Story Atlas the same two again (Robert, 1 Nov 2026, 06:27);
 *   5. the data file, the Word and PDF files and the library as a spreadsheet (library.csv, IDEAS-1f) go
 *      into one ZIP (buildExportZip()), behind a "READ ME FIRST" guide to them (IDEAS-2a);
 *   6. the older copies' files are deleted, so only one copy of the person's data is kept;
 *   7. the ZIP is uploaded to the private exports bucket;
 *   8. finish_data_export() marks it ready for seven days and sends the notification.
 * It runs in the background of the open tab: the person can keep using the app (it keeps going
 * when the Settings panel closes), and the panel shows its state through exportRunStore.ts. If the
 * tab closes halfway, asking again starts afresh.
 * Who calls it: startDataExport() in exportRunStore.ts, which loads this file (and the Word and
 * ZIP libraries with it) only when a copy is asked for, so Settings stays small; the PDF library
 * loads only once the first PDF is built.
 * What it calls: api/dataExport.ts and the libs beside it.
 */
import { brand } from '@/config/brand';
import type { AppSupabaseClient } from '@/lib/supabase';
import { planToPdf } from '@/lib/pdf/planToPdf';
import { storyToPdf } from '@/lib/pdf/storyToPdf';
import { planToWord } from '@/lib/word/planToWord';
import { storyToWord } from '@/lib/word/storyToWord';
import type {
  WordDateFormatter,
  WordLabels,
  WordPicture,
  WordPlan,
  WordStory,
} from '@/lib/word/wordTypes';

import {
  type DataExportDocument,
  type DocumentKind,
  deleteExportFiles,
  downloadPicture,
  fetchDataExportDocument,
  fetchMyDataExports,
  finishDataExport,
  requestDataExport,
  uploadExportFile,
} from '../api/dataExport';

import { buildExportZip, type ZipEntry } from './buildExportZip';
import { exportGuideFile, type ExportGuideWords } from './exportGuide';
import { libraryCsvFile, withLibraryLinks, type LibraryCsvLabels } from './libraryForExport';
import { pictureForWord } from './pictureForWord';
import { plansFrom, type PlanWords } from './planForWord';
import { wordFileName, wordInputFrom, type StatusLabels, type WordInput } from './storiesForWord';

/** What a run needs from the screen: the client and the words, already translated. */
export interface DataExportRunOptions {
  client: AppSupabaseClient;
  wordLabels: WordLabels;
  statusLabels: StatusLabels;
  formatDate: WordDateFormatter;
  /** The atlas and dataExport texts, for the plan's Word file. */
  planText: Pick<PlanWords, 'atlas' | 'own'>;
  /** Draws a picture for Word; the browser's canvas by default, a fake in tests. */
  preparePicture?: (file: Blob) => Promise<WordPicture | null>;
}

/**
 * Loads every picture the stories show, drawn for Word. A picture that can't be loaded is left
 * out; its Word file says "Picture: <alt text>" instead.
 *
 * @returns the pictures by ID
 */
async function loadPictures(
  input: WordInput,
  options: DataExportRunOptions,
): Promise<Map<string, WordPicture>> {
  const prepare = options.preparePicture ?? pictureForWord;
  const loaded = new Map<string, WordPicture>();
  for (const picture of input.pictures) {
    const file = await downloadPicture(options.client, picture);
    const ready = file === null ? null : await prepare(file);
    if (ready !== null) loaded.set(picture.id, ready);
  }
  return loaded;
}

/** Every document kind, as Download my data and staff copies hold them (ADMIN-2d). */
export const BOTH_DOCUMENT_KINDS: DocumentKind[] = ['word', 'pdf'];

/** A file's ending for each document kind. */
const endingOf: Record<DocumentKind, string> = { word: 'docx', pdf: 'pdf' };

/**
 * One story's document of one kind, from the shared builders.
 *
 * @returns the file's bytes
 */
function storyDocument(
  kind: DocumentKind,
  story: WordStory,
  builderOptions: Parameters<typeof storyToWord>[1],
): Promise<Uint8Array> {
  return kind === 'word' ? storyToWord(story, builderOptions) : storyToPdf(story, builderOptions);
}

/**
 * One story's plan of one kind, from the shared builders.
 *
 * @returns the file's bytes
 */
function planDocument(kind: DocumentKind, plan: WordPlan, labels: WordLabels): Promise<Uint8Array> {
  return kind === 'word' ? planToWord(plan, { labels }) : planToPdf(plan, { labels });
}

/**
 * One document per story and kind (a Word file, a PDF or both), named after its slug. Download my
 * stories (runStoriesExport.ts) and staff copies use it too, so every copy holds the same files.
 *
 * @param taken - the names used so far in the same ZIP (the stories' are added)
 * @param kinds - which documents to make; Word only when left out
 * @returns the files for the ZIP
 */
export async function buildWordFiles(
  input: WordInput,
  options: DataExportRunOptions,
  taken: Set<string> = new Set<string>(),
  kinds: DocumentKind[] = ['word'],
): Promise<ZipEntry[]> {
  // Step 1: the pictures once, for every file.
  const pictures = await loadPictures(input, options);
  const builderOptions = {
    labels: options.wordLabels,
    formatDate: options.formatDate,
    assets: { pictures, embeds: input.embeds },
  };
  // Step 2: each story in each kind, Word before PDF.
  const files: ZipEntry[] = [];
  for (const entry of input.stories) {
    for (const kind of kinds) {
      const bytes = await storyDocument(kind, entry.story, builderOptions);
      files.push({ fileName: wordFileName(entry.slug, taken, endingOf[kind]), bytes });
    }
  }
  return files;
}

/**
 * One document per story's plan from Story Atlas and kind, named "<slug>-plan.docx" and
 * "<slug>-plan.pdf" (Robert, 1 Nov 2026, 06:27; ADMIN-2d). Download my stories uses it too.
 *
 * @param document - the data file, whole or narrowed to the chosen stories
 * @param taken - the names used so far in the same ZIP (the plan's are added)
 * @param kinds - which documents to make; Word only when left out
 * @returns the files for the ZIP
 */
export async function buildPlanFiles(
  document: DataExportDocument,
  options: DataExportRunOptions,
  taken: Set<string>,
  kinds: DocumentKind[] = ['word'],
): Promise<ZipEntry[]> {
  const plans = plansFrom(document, {
    ...options.planText,
    chapterNumber: options.wordLabels.chapterNumber,
    formatDate: options.formatDate,
  });
  const files: ZipEntry[] = [];
  for (const entry of plans) {
    for (const kind of kinds) {
      const bytes = await planDocument(kind, entry.plan, options.wordLabels);
      files.push({ fileName: wordFileName(`${entry.slug}-plan`, taken, endingOf[kind]), bytes });
    }
  }
  return files;
}

/** The guide's words for a copy made at a given moment (an ISO time), translated (IDEAS-2a). */
export type ExportGuideWordsFor = (madeAt: string) => ExportGuideWords;

/**
 * What makeDataExport() needs on top of a run: the library spreadsheet's words (IDEAS-1f) and the
 * "READ ME FIRST" guide's (IDEAS-2a).
 */
export interface DataExportOptions extends DataExportRunOptions {
  libraryLabels: LibraryCsvLabels;
  guideWords: ExportGuideWordsFor;
}

/** The person's older copies that can still be deleted (ready and unexpired). */
async function olderFileNames(client: AppSupabaseClient, newExportId: string): Promise<string[]> {
  const copies = await fetchMyDataExports(client);
  const now = Date.now();
  return copies
    .filter((copy) => copy.id !== newExportId && copy.state === 'ready')
    .filter((copy) => copy.expires_at !== null && Date.parse(copy.expires_at) > now)
    .map((copy) => copy.file_name);
}

/**
 * Makes one copy, every step in order.
 *
 * @param options - the client and the translated words
 * @returns how many stories the ZIP holds (each as a Word file and a PDF)
 * @throws Error with a plain message at the first step that fails
 */
export async function makeDataExport(options: DataExportOptions): Promise<number> {
  // Steps 1 and 2: open a copy and read the data file; the library's addresses become full links
  // to the website (IDEAS-1f).
  const opened = await requestDataExport(options.client);
  const document = withLibraryLinks(await fetchDataExportDocument(options.client), brand.siteUrl);
  // Steps 3 to 5: the Word and PDF files and the ZIP, built here in the browser (ADR 0012).
  const input = wordInputFrom(document, options.statusLabels);
  const taken = new Set<string>();
  const wordFiles = await buildWordFiles(input, options, taken, BOTH_DOCUMENT_KINDS);
  const planFiles = await buildPlanFiles(document, options, taken, BOTH_DOCUMENT_KINDS);
  // The library as a spreadsheet too, when there is one (IDEAS-1f).
  const libraryFile = libraryCsvFile(document, options.libraryLabels);
  const extraFiles = libraryFile === null ? [] : [libraryFile];
  const files = [...wordFiles, ...planFiles, ...extraFiles];
  // The guide says what each of those files holds, in the person's language (IDEAS-2a).
  const guide = exportGuideFile(
    { tables: document.tables, files },
    options.guideWords(document.made_at),
  );
  const zip = await buildExportZip(document, files, guide);
  // Step 6: the older copies' files go before the new one is saved.
  await deleteExportFiles(options.client, await olderFileNames(options.client, opened.exportId));
  // Steps 7 and 8: save the ZIP, then mark it ready and notify.
  await uploadExportFile(options.client, opened.fileName, zip);
  const storyCount = input.stories.length;
  await finishDataExport(options.client, opened.exportId, storyCount);
  return storyCount;
}
