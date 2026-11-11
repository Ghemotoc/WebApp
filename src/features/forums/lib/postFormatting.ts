/**
 * The formatting buttons' text changes: bold, italic, link, quote and list in a forum post's
 * Markdown (bundle GAPS-16, part b; story S1-E8-02; board 5.2, the toolbar above "Your reply").
 *
 * Each change takes the box's text and what is selected, and gives back the new text and what to
 * select afterwards, so the writer can keep typing. Bold and italic wrap the selection (or put the
 * marks around the cursor) and take them off again when they are already there; a link wraps the
 * selection as its words and selects the address to type; quote and list add "> " or "- " to the
 * start of every selected line, or take it off when every line has it.
 * Only the formatting the posts draw is offered ("Simple formatting only", ForumPostText).
 * Who calls it: PostFormatToolbar and PostEditor's keyboard shortcuts. It calls nothing.
 */

/** The five buttons. */
export type PostFormat = 'bold' | 'italic' | 'link' | 'quote' | 'list';

/** The box's text and selection, before or after a change. */
export interface TextSelection {
  text: string;
  start: number;
  end: number;
}

/** The marks bold and italic put around words. */
const wrapMarks = { bold: '**', italic: '*' } as const;

/** The marks quote and list put at the start of a line. */
const lineMarks = { quote: '> ', list: '- ' } as const;

/** The address a new link starts with, selected so the writer types over it. */
export const linkAddressStart = 'https://';

/**
 * Applies one button to the text.
 *
 * @param before - the text and selection now
 * @param format - which button was pressed
 * @param linkWords - the words a link gets when nothing is selected ("link text" in the reader's
 *   language)
 * @returns the new text and selection
 */
export function applyPostFormat(
  before: TextSelection,
  format: PostFormat,
  linkWords: string,
): TextSelection {
  if (format === 'bold' || format === 'italic') return toggleWrap(before, wrapMarks[format]);
  if (format === 'link') return addLink(before, linkWords);
  return toggleLinePrefix(before, lineMarks[format]);
}

/**
 * Puts a mark on both sides of the selection, or takes it off when it is already there.
 *
 * @param before - the text and selection
 * @param mark - "**" or "*"
 * @returns the new text, with the same words selected
 */
function toggleWrap(before: TextSelection, mark: string): TextSelection {
  const { text, start, end } = before;
  // Step 1: already wrapped (the marks sit just outside the selection): take them off.
  const hasMarks =
    text.slice(start - mark.length, start) === mark && text.slice(end, end + mark.length) === mark;
  // Italic's "*" also matches the inside of bold's "**", so a bold word isn't "already italic".
  const isInsideBold = mark === '*' && text.slice(start - 2, start) === '**';
  if (hasMarks && !isInsideBold) {
    const unwrapped =
      text.slice(0, start - mark.length) + text.slice(start, end) + text.slice(end + mark.length);
    return { text: unwrapped, start: start - mark.length, end: end - mark.length };
  }
  // Step 2: wrap the selection; with nothing selected the cursor lands between the marks.
  const wrapped = text.slice(0, start) + mark + text.slice(start, end) + mark + text.slice(end);
  return { text: wrapped, start: start + mark.length, end: end + mark.length };
}

/**
 * Turns the selection into a link's words and selects the address to type.
 *
 * @param before - the text and selection
 * @param linkWords - the words to use when nothing is selected
 * @returns "[words](https://)" with "https://" selected
 */
function addLink(before: TextSelection, linkWords: string): TextSelection {
  const { text, start, end } = before;
  const words = start === end ? linkWords : text.slice(start, end);
  const link = `[${words}](${linkAddressStart})`;
  // The address starts after "[", the words and "](".
  const addressStart = start + words.length + 3;
  return {
    text: text.slice(0, start) + link + text.slice(end),
    start: addressStart,
    end: addressStart + linkAddressStart.length,
  };
}

/**
 * Adds a mark to the start of every line the selection touches, or takes it off when every one
 * of those lines has it already.
 *
 * @param before - the text and selection
 * @param mark - "> " or "- "
 * @returns the new text, with the same lines selected
 */
function toggleLinePrefix(before: TextSelection, mark: string): TextSelection {
  const { text, start, end } = before;
  // Step 1: the whole lines the selection touches.
  const blockStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', end);
  const blockEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(blockStart, blockEnd).split('\n');
  // Step 2: take the mark off when every line has it, otherwise add it to each line.
  const isMarked = lines.every((line) => line.startsWith(mark));
  const changed = lines.map((line) => (isMarked ? line.slice(mark.length) : mark + line));
  const block = changed.join('\n');
  // Step 3: keep the cursor on the same words; with a selection, select the changed lines.
  const shift = isMarked ? -mark.length : mark.length;
  const newStart = Math.max(blockStart, start + shift);
  const newEnd = start === end ? newStart : blockStart + block.length;
  return {
    text: text.slice(0, blockStart) + block + text.slice(blockEnd),
    start: newStart,
    end: newEnd,
  };
}
