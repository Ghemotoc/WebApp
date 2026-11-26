/**
 * headingSentences: splits a CMS heading after its first sentence, so the page can draw the rest
 * in the look's accent (user story 1.2, board A02: "You own your work." in the heading colour,
 * "You decide where it goes." in violet, as the hero's two lines).
 *
 * Who calls it: WhyWriteSection. It calls nothing.
 */

/** The two parts of a heading: the first sentence and whatever follows it. */
export interface HeadingSentences {
  first: string;
  rest: string;
}

/**
 * Splits a heading after the first full stop, question mark or exclamation mark followed by a
 * space. A heading of one sentence comes back whole in `first`, with `rest` empty.
 *
 * @param heading - the heading as the CMS holds it
 * @returns the first sentence and the rest, both trimmed
 */
export function splitHeadingSentences(heading: string): HeadingSentences {
  // Step 1: find where the first sentence ends (its mark, then a space).
  const match = /[.!?]\s+/.exec(heading);
  if (match === null) return { first: heading.trim(), rest: '' };
  // Step 2: keep the mark with the first sentence and drop the space between them.
  const cut = match.index + 1;
  return { first: heading.slice(0, cut).trim(), rest: heading.slice(cut).trim() };
}
