/**
 * paragraph-link: the part of a chapter's address that opens one paragraph's comment thread
 * (bundle IDEAS-1, part e; idea IDEA-20261031-2).
 *
 * "#paragraph-4" opens the thread of paragraph 4 (counted from 1, as src/lib/chapter-blocks.ts
 * counts them); "#paragraph-earlier" opens the comments left on paragraphs the writer has since
 * changed (S1-E6-06). The address carries only a number, never who commented.
 * Who uses it: the notifications page builds the link (notificationText.ts); the chapter reader
 * reads it back (ChapterReaderPage's useParagraphComments).
 */

/** Where a paragraph thread is: a paragraph's number, or the comments on an earlier version. */
export type ParagraphLinkPlace = number | 'earlier';

/** The start every paragraph hash shares. */
const hashStart = '#paragraph-';

/**
 * The hash that opens a paragraph's thread.
 *
 * @param place - the paragraph's number, or 'earlier'
 * @returns "#paragraph-4" or "#paragraph-earlier"
 */
export function paragraphHash(place: ParagraphLinkPlace): string {
  return `${hashStart}${String(place)}`;
}

/**
 * The thread a hash asks for, if any.
 *
 * @param hash - the address's hash, such as window.location.hash
 * @returns the paragraph's number, 'earlier', or null when the hash isn't a paragraph link
 */
export function paragraphPlaceFromHash(hash: string): ParagraphLinkPlace | null {
  if (!hash.startsWith(hashStart)) return null;
  const rest = hash.slice(hashStart.length);
  if (rest === 'earlier') return 'earlier';
  // Only a whole number from 1 counts; "#paragraph-0" or "#paragraph-x" is ignored.
  if (!/^[1-9]\d{0,4}$/.test(rest)) return null;
  return Number(rest);
}
