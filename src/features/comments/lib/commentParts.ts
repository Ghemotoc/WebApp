/**
 * Comments on chosen words: matching a comment to the underlined part it is on, and grouping a
 * stanza's panel (READER-SELECT, board B13-ReaderPartComments, Robert's option A, 24 Nov 2026).
 *
 * One panel per stanza or paragraph: the comments on the whole of it come first, with no heading,
 * then one group per underlined part in text order. A comment whose words the writer has since
 * changed is no longer underlined, so it moves to the first group and keeps its quote ("nothing
 * is lost"). A group with no comments left (all deleted, hidden or blocked) is left out.
 * Who uses it: ParagraphThread and its groups (src/features/comments/components/), the reader's
 * underlines (src/features/reading/components/PartHighlights.tsx) and the selection bar.
 * What it calls: nothing; plain functions over the API's shapes.
 */
import type { CommentPart } from '@/features/reading/api/paragraphComments';

import type { ChapterComment, CommentQuote } from '../api/comments';

/** How many words of chosen words a short form shows before the ellipsis. */
const SHORT_WORD_COUNT = 8;

/**
 * A key that names one set of chosen words, the same for a comment's quote and for the part in
 * the text. It leaves out the paragraph's number, which moves when the writer adds a paragraph
 * above; the offsets, how many paragraphs the words cross and the words themselves stay.
 *
 * @param quote - where the words start and end, and what they say
 * @returns the key, for example "12|0|48|the knife coming"
 */
export function partKey(quote: CommentQuote): string {
  return [quote.startOffset, quote.endBlock - quote.startBlock, quote.endOffset, quote.text].join(
    '|',
  );
}

/**
 * The chosen words of a part in the text, as a quote a new comment can be posted on.
 *
 * @param part - the underlined part, from paragraph_comment_counts()
 * @returns the same words as a CommentQuote
 */
export function quoteOfPart(part: CommentPart): CommentQuote {
  return {
    text: part.quote,
    startBlock: part.block,
    startOffset: part.startOffset,
    endBlock: part.endBlock,
    endOffset: part.endOffset,
  };
}

/**
 * Chosen words for reading: a poem's line breaks become " / ", as the boards draw them.
 *
 * @param text - the words as stored (lines end in a new line)
 * @returns one line, for example "the knife coming towards her heart / the way her mother taught her,"
 */
export function quoteForReading(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' / ');
}

/**
 * The first few chosen words, ending in an ellipsis when there are more ("Commenting on …").
 *
 * @param text - the words as stored
 * @returns the opening words
 */
export function shortQuote(text: string): string {
  const words = quoteForReading(text).split(/\s+/).filter(Boolean);
  if (words.length <= SHORT_WORD_COUNT) return words.join(' ');
  return `${words.slice(0, SHORT_WORD_COUNT).join(' ')}…`;
}

/** One group in a stanza's panel. */
export interface CommentGroup {
  /** The part's key, or null for the comments on the whole stanza. */
  key: string | null;
  /** The part's words as a quote, or null for the whole stanza. */
  quote: CommentQuote | null;
  comments: ChapterComment[];
}

/**
 * Splits a stanza's comments into its groups (board B13): the whole stanza first, then each
 * underlined part in text order. Inside a group the comments keep the order they came in.
 *
 * @param comments - the stanza's comments, as paragraph_comments() lists them
 * @param parts - the underlined parts that start in this stanza, in text order
 * @returns the groups; the first is the whole stanza's, even when it is empty
 */
export function groupStanzaComments(
  comments: ChapterComment[],
  parts: CommentPart[],
): CommentGroup[] {
  // Step 1: one empty group per underlined part, found by its key.
  const partGroups = parts.map((part) => {
    const quote = quoteOfPart(part);
    return { key: partKey(quote), quote, comments: [] as ChapterComment[] };
  });
  const byKey = new Map(partGroups.map((group) => [group.key, group]));
  const whole: CommentGroup = { key: null, quote: null, comments: [] };
  // Step 2: each comment joins its part's group, or the whole stanza's when its words are gone.
  for (const comment of comments) {
    const group = comment.quote === null ? undefined : byKey.get(partKey(comment.quote));
    (group ?? whole).comments.push(comment);
  }
  // Step 3: a part whose comments have all gone has no group (and no underline, board B13).
  return [whole, ...partGroups.filter((group) => group.comments.length > 0)];
}

/**
 * Which box the foot shows: one per set of words, and one while lines are being ticked.
 *
 * @param quote - the words, or null for the whole stanza
 * @param isPicking - true while Choose lines is on
 * @returns the key for the composer
 */
export function composerKey(quote: CommentQuote | null, isPicking: boolean): string {
  if (isPicking) return 'picking';
  return quote === null ? 'whole' : partKey(quote);
}
