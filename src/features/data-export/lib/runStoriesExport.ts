/**
 * Makes one Download my stories copy, start to finish (story S1-E13-05; ADR 0012, as Download my
 * data).
 *
 * The steps, in this order:
 *   1. request_stories_export() opens a copy of one story or all of them, or answers that the
 *      same files from the last 24 hours can be offered (criterion 4), and then nothing is made;
 *   2. my_data_export() answers the writer's stories and chapters, narrowed to the chosen story;
 *   3. each story becomes a Word file with the same builder as Download my data (buildWordFiles(),
 *      every chapter including drafts, the dates and the user ID, as S1-E11-09 asks);
 *   4. one story is uploaded as its Word file, several as one ZIP of Word files;
 *   5. the older copy's file is deleted, then finish_data_export() marks the new one ready for
 *      seven days and sends the stories_export_ready notification.
 * Who calls it: startStoriesExport() in exportRunStore.ts, loaded only when Word files are asked
 * for. What it calls: api/dataExport.ts and the libs beside it.
 */
import {
  deleteExportFiles,
  fetchDataExportDocument,
  fetchMyDataExports,
  finishDataExport,
  requestStoriesExport,
  uploadExportFile,
  WORD_TYPE,
  ZIP_TYPE,
} from '../api/dataExport';

import { buildWordZip } from './buildExportZip';
import { buildWordFiles, type DataExportRunOptions } from './runDataExport';
import { documentForStory, wordInputFrom } from './storiesForWord';

/** What a run needs: as Download my data, plus the story (null for all of them). */
export interface StoriesExportRunOptions extends DataExportRunOptions {
  storyId: string | null;
}

/** How a run ended: the earlier files were offered, or new ones were made. */
export type StoriesExportOutcome = 'reused' | 'made';

/** The writer's older Word files that can still be deleted (ready and unexpired). */
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

/**
 * Makes the copy, every step in order.
 *
 * @param options - the client, the translated words and the story
 * @returns 'reused' when the earlier files were offered, 'made' otherwise
 * @throws Error with a plain message at the first step that fails
 */
export async function makeStoriesExport(
  options: StoriesExportRunOptions,
): Promise<StoriesExportOutcome> {
  // Step 1: open a copy, or offer the earlier one.
  const opened = await requestStoriesExport(options.client, options.storyId);
  if (opened.outcome === 'reused') return 'reused';
  // Steps 2 and 3: the chosen stories as Word files, built here in the browser.
  const document = documentForStory(await fetchDataExportDocument(options.client), options.storyId);
  const wordFiles = await buildWordFiles(wordInputFrom(document, options.statusLabels), options);
  const firstFile = wordFiles[0];
  if (firstFile === undefined) throw new Error('There was no story to put in the Word files.');
  // Step 4: one story is its Word file; several are a ZIP.
  const isSingleStory = options.storyId !== null;
  const bytes = isSingleStory ? firstFile.bytes : await buildWordZip(wordFiles);
  // Step 5: the older file goes, the new one is saved, then marked ready.
  await deleteExportFiles(options.client, await olderStoryFileNames(options, opened.exportId));
  await uploadExportFile(
    options.client,
    opened.fileName,
    bytes,
    isSingleStory ? WORD_TYPE : ZIP_TYPE,
  );
  await finishDataExport(options.client, opened.exportId, wordFiles.length);
  return 'made';
}
