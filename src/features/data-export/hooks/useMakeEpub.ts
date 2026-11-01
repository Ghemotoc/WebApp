/**
 * The hook behind "Make EPUB" in Download my stories (story S1-E13-05, PRIVACY part f).
 *
 * It picks the book's language (the story's, when it is Romanian or English; otherwise the
 * screen's), makes sure staff edits to the book's words are laid over the files for that
 * language, loads the builder only now (the EPUB code never ships to people who don't use it),
 * makes the book in the browser and hands it to the browser as a download. Nothing is sent or
 * stored: the name and any picture the writer picked stay on the device (rule 5).
 * Who calls it: EpubDialog. What it calls: runEpub.ts and applyLocaleOverrides().
 */
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { applyLocaleOverrides } from '@/lib/interface-text-overrides';

import type { EpubForm } from '../lib/runEpub';
import { useDataExportTranslation } from '../registerDataExportTranslations';

/** Where making the book is: not started, making it, saved under a name, or failed. */
export type EpubState =
  | { phase: 'idle' }
  | { phase: 'making' }
  | { phase: 'saved'; fileName: string }
  | { phase: 'failed' };

/** Hands the finished file to the browser as a download. */
function saveOnDevice(bytes: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(
    new Blob([Uint8Array.from(bytes)], { type: 'application/epub+zip' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Freed a moment later, once the browser has started saving.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Makes and saves the EPUB of one story.
 *
 * @param story - the story's ID and language
 * @returns the state and make(form), which never throws: a failure shows as the failed state
 */
export function useMakeEpub(story: { id: string; languageCode: string }) {
  const { i18n } = useDataExportTranslation();
  const [state, setState] = useState<EpubState>({ phase: 'idle' });

  /** Makes the book from the form, then saves it. */
  async function make(form: EpubForm): Promise<void> {
    setState({ phase: 'making' });
    try {
      // Step 1: the book's language and its words, with staff edits for that language.
      const isBookLanguage = story.languageCode === 'ro' || story.languageCode === 'en';
      const bookLanguage = isBookLanguage ? story.languageCode : i18n.language;
      if (bookLanguage !== i18n.language) {
        await applyLocaleOverrides(i18n, bookLanguage, 'dataExport');
      }
      // Step 2: the builder, loaded only now, then the book.
      const { makeEpub } = await import('../lib/runEpub');
      const book = await makeEpub({
        client: await requireClient(),
        storyId: story.id,
        form,
        bookText: i18n.getFixedT(bookLanguage, 'dataExport'),
        bookLanguage,
      });
      // Step 3: straight to the device.
      saveOnDevice(book.bytes, book.fileName);
      setState({ phase: 'saved', fileName: book.fileName });
    } catch (error) {
      console.warn(`The EPUB couldn't be made: ${String(error)}`);
      setState({ phase: 'failed' });
    }
  }

  return { state, make };
}
