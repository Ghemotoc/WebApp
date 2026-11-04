/**
 * The first post of a forum thread started from a chapter passage (bundle 14d IDEAS-3, part f;
 * idea IDEA-20261102-10, criterion 1): the passage quoted, then a link back to the chapter.
 *
 * The quote is the same short passage sharing already allows (at most 280 characters and five
 * blocks), so the copy limits stay as they are. The link is the passage link (S1-E4-11): no
 * sharer ID and no tracking code.
 * Who calls it: components/DiscussPassageButton.tsx. What it calls: lib/shareLink.ts.
 */
import type { SpotRange } from '@/lib/chapter-blocks';

import type { ChapterAddress } from '../api/sharing';

import { passageShareLink } from './shareLink';

/** The forum a passage goes to: "Book talk", in Reading. */
export const passageForumSlug = 'book-talk';

/** What the new-thread form gets through the router's state. */
export interface PassageThreadDraft {
  initialBody: string;
}

/**
 * Builds the first post's words.
 *
 * @param passage - the selected passage, its spaces already made single
 * @param linkText - the link's words, already translated ("From chapter 3 of “Ploaia”")
 * @param link - where it points: the chapter's address and the passage's blocks
 * @param link.address - the chapter
 * @param link.blocks - the blocks the passage covers
 * @returns the Markdown: a quote, a blank line, then the link
 */
export function passageThreadBody(
  passage: string,
  linkText: string,
  link: { address: ChapterAddress; blocks: SpotRange },
): string {
  // Square brackets would end the link's words early, so they become round ones.
  const safeLinkText = linkText.replace(/\[/g, '(').replace(/\]/g, ')');
  return `> ${passage.trim()}\n\n[${safeLinkText}](${passageShareLink(link.address, link.blocks)})\n\n`;
}

/**
 * Reads the draft a passage button sent, from the router's state.
 *
 * @param state - location.state, whatever it holds
 * @returns the first post's words, or an empty string when the page wasn't opened from a passage
 */
export function initialBodyFrom(state: unknown): string {
  if (typeof state !== 'object' || state === null) return '';
  const body = (state as Partial<PassageThreadDraft>).initialBody;
  return typeof body === 'string' ? body : '';
}
