/**
 * Counts one share of a chapter in the background (story S1-E4-05, third criterion).
 *
 * In its own file so the Share button can fetch it after the share has happened: the database
 * code it needs stays out of the chapter reader's 40 KB script budget
 * (e2e/reader-performance.spec.ts). A failure only means one share isn't counted, so the reader
 * isn't troubled with it, but it is logged.
 * Who calls it: ShareButton, through a dynamic import. What it calls: api/sharing.ts →
 * record_chapter_share().
 */
import { requireClient } from '@/features/account/hooks/useMyNames';

import { recordChapterShare, type ChapterAddress } from '../api/sharing';

/**
 * Counts the share; never throws.
 *
 * @param address - the chapter
 */
export async function countShare(address: ChapterAddress): Promise<void> {
  try {
    await recordChapterShare(await requireClient(), address);
  } catch (error) {
    console.warn('The share was not counted.', error);
  }
}
