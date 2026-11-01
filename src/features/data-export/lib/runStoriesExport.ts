/**
 * Makes one Download my stories copy, start to finish (story S1-E13-05; ADR 0012, as Download my
 * data; Robert, 1 Nov 2026, 06:27 and 06:29: the writer chooses what goes in).
 *
 * The steps, in this order:
 *   1. request_stories_export() opens a copy of one story or all of them with the writer's
 *      choices, or answers that the same files from the last 24 hours can be offered
 *      (criterion 4), and then nothing is made;
 *   2. my_data_export() answers the writer's data, narrowed to the chosen stories and chapters
 *      (documentForChoice());
 *   3. the files the writer ticked are made with the same builders as Download my data: the
 *      chapters as a Word file per story (buildWordFiles(): drafts included, with the dates and
 *      the user ID, as S1-E11-09 asks), the plan from Story Atlas as a Word file per story
 *      (buildPlanFiles()) and the machine-readable copy (JSON);
 *   4. one file for one story is uploaded as it is; anything more as one ZIP;
 *   5. the older copy's file is deleted, then finish_data_export() marks the new one ready for
 *      seven days and sends the stories_export_ready notification.
 * Who calls it: startStoriesExport() in exportRunStore.ts, loaded only when files are asked for.
 * What it calls: api/dataExport.ts and the libs beside it.
 */
import {
  type DataExportDocument,
  deleteExportFiles,
  fetchDataExportDocument,
  fetchMyDataExports,
  finishDataExport,
  JSON_TYPE,
  requestStoriesExport,
  uploadExportFile,
  WORD_TYPE,
  ZIP_TYPE,
  type StoriesExportChoices,
} from '../api/dataExport';

import { buildWordZip, type ZipEntry } from './buildExportZip';
import { buildPlanFiles, buildWordFiles, type DataExportRunOptions } from './runDataExport';
import { documentForChoice } from './storiesForData';
import { wordInputFrom } from './storiesForWord';

/** What a run needs: as Download my data, plus the writer's choices. */
export interface StoriesExportRunOptions extends DataExportRunOptions {
  choices: StoriesExportChoices;
}

/** How a run ended: the earlier files were offered, or new ones were made. */
export type StoriesExportOutcome = 'reused' | 'made';

/** The writer's older copies' files that can still be deleted (ready and unexpired). */
async function olderStoryFileNames(
  options: StoriesExportRunOptions,
  newExportId: string,
): Promise<string[]> {
  const copies = await fetchMyDataExports(options.client, 'my_stories');
  const now = Date.now();
  return copies
    .filter((copy) => copy.id !== newExportId && copy.state === 'ready')
    .filter((copy) => copy.expires_at !== null && Date.parse(copy.expires_at) > now)
    .map((copy) => copy.file_name);
}

/** The JSON copy: the narrowed data file, readable by people too, in UTF-8. */
function jsonFile(document: DataExportDocument, storyId: string | null): ZipEntry {
  const story = (document.tables.stories ?? [])[0];
  const name = storyId === null || story === undefined ? 'my-stories' : story.slug;
  return {
    fileName: `${name}.json`,
    // Copied into this page's own Uint8Array, so the ZIP library always recognises it.
    bytes: Uint8Array.from(new TextEncoder().encode(JSON.stringify(document, null, 2))),
  };
}

/**
 * Every file the writer ticked, for the chosen stories.
 *
 * @returns the files, the chapters' Word files first, then the plans', then the JSON copy
 */
async function chosenFiles(
  document: DataExportDocument,
  options: StoriesExportRunOptions,
): Promise<ZipEntry[]> {
  const { choices } = options;
  const taken = new Set<string>();
  const files: ZipEntry[] = [];
  if (choices.includeChapters) {
    const input = wordInputFrom(document, options.statusLabels);
    files.push(...(await buildWordFiles(input, options, taken)));
  }
  if (choices.includePlan) files.push(...(await buildPlanFiles(document, options, taken)));
  if (choices.includeData) files.push(jsonFile(document, choices.storyId));
  return files;
}

/** The file type of a single file, by its name. */
function typeOfSingleFile(fileName: string): string {
  return fileName.endsWith('.json') ? JSON_TYPE : WORD_TYPE;
}

/**
 * Makes the copy, every step in order.
 *
 * @param options - the client, the translated words and the writer's choices
 * @returns 'reused' when the earlier files were offered, 'made' otherwise
 * @throws Error with a plain message at the first step that fails
 */
export async function makeStoriesExport(
  options: StoriesExportRunOptions,
): Promise<StoriesExportOutcome> {
  // Step 1: open a copy, or offer the earlier one.
  const opened = await requestStoriesExport(options.client, options.choices);
  if (opened.outcome === 'reused') return 'reused';
  // Steps 2 and 3: the chosen files, built here in the browser.
  const document = documentForChoice(
    await fetchDataExportDocument(options.client),
    options.choices,
  );
  const files = await chosenFiles(document, options);
  const firstFile = files[0];
  if (firstFile === undefined) throw new Error('There was nothing to put in the files.');
  // Step 4: one file is saved as it is, as the database named it (.docx or .json); more is a ZIP.
  const isZip = opened.fileName.endsWith('.zip');
  const bytes = isZip ? await buildWordZip(files) : firstFile.bytes;
  const fileType = isZip ? ZIP_TYPE : typeOfSingleFile(firstFile.fileName);
  // Step 5: the older file goes, the new one is saved, then marked ready.
  await deleteExportFiles(options.client, await olderStoryFileNames(options, opened.exportId));
  await uploadExportFile(options.client, opened.fileName, bytes, fileType);
  const storyCount = (document.tables.stories ?? []).length;
  await finishDataExport(options.client, opened.exportId, storyCount);
  return 'made';
}
