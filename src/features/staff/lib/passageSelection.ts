/**
 * The passage staff selected in a chapter's read-only words (bundle ADMIN-2, part b2; story
 * S1-E11-08 criterion "remove the exact passage").
 *
 * The same words can appear more than once in a chapter, so the selection is sent as the words
 * plus which copy of them it is (0 for the first). The database counts copies the same way
 * (admin_passage_place(): each copy found, then one character on), so it cuts exactly the copy
 * staff selected, and refuses when the writer has changed those words since.
 * Who calls it: ChapterPassageForm. What it calls: nothing.
 */
import type { ChapterPassage } from '../api/staffStoryChanges';

/**
 * How many copies of `passage` start before `start` in `text`, overlapping copies included.
 *
 * @param text - the chapter's words
 * @param passage - the selected words
 * @param start - where the selection starts
 * @returns the number of earlier copies
 */
function earlierCopies(text: string, passage: string, start: number): number {
  let copies = 0;
  let foundAt = text.indexOf(passage);
  // Each copy before the selection counts; the search moves on one character at a time.
  while (foundAt !== -1 && foundAt < start) {
    copies += 1;
    foundAt = text.indexOf(passage, foundAt + 1);
  }
  return copies;
}

/**
 * The selected passage, ready to send.
 *
 * @param text - the chapter's words
 * @param start - selectionStart of the read-only field
 * @param end - selectionEnd of the read-only field
 * @param caseReference - the case it is for, or empty
 * @returns the passage, or null when nothing but spaces is selected
 */
export function selectedPassage(
  text: string,
  start: number,
  end: number,
  caseReference: string,
): ChapterPassage | null {
  const passage = text.slice(start, end);
  if (passage.trim() === '') return null;
  return {
    text: passage,
    occurrence: earlierCopies(text, passage, start),
    caseReference: caseReference.trim(),
  };
}
