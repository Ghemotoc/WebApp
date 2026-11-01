/**
 * Counts one share of a chapter in the background (story S1-E4-05, third criterion), and sends
 * the chapter_shared analytics event (S1-E15-01).
 *
 * In its own file so the Share button can fetch it after the share has happened: the database
 * code it needs stays out of the chapter reader's 40 KB script budget
 * (e2e/reader-performance.spec.ts). A failure only means one share isn't counted, so the reader
 * isn't troubled with it, but it is logged.
 * Who calls it: ShareButton, PassageLinkButton and the picture card, through a dynamic import.
 * What it calls: api/sharing.ts → record_chapter_share(), or record_passage_share() for a passage or
 * picture link, which also counts each paragraph for the writer's most-loved lines (IDEAS-1d).
 */
import { requireClient } from '@/features/account/hooks/useMyNames';
import { trackEvent } from '@/lib/analytics/track';

import type { SpotRange } from '@/lib/chapter-blocks';

import { recordChapterShare, recordPassageShare, type ChapterAddress } from '../api/sharing';

/**
 * Counts the share; never throws.
 *
 * @param address - the chapter
 * @param method - how it was shared: copied link or the device's share sheet
 * @param range - the paragraphs a passage or picture link covers; left out for a whole chapter
 */
export async function countShare(
  address: ChapterAddress,
  method: 'copy_link' | 'share_sheet',
  range: SpotRange | null = null,
): Promise<void> {
  // The way it was shared only, never the chapter (docs/analytics-events.md).
  trackEvent('chapter_shared', { method });
  try {
    const client = await requireClient();
    if (range === null) await recordChapterShare(client, address);
    else await recordPassageShare(client, address, range);
  } catch (error) {
    console.warn('The share was not counted.', error);
  }
}
