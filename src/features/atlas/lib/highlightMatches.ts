/**
 * highlightMatches: the parts of a search snippet that match what the writer typed (story
 * S1-E17-30: "the match highlighted").
 *
 * Matching ignores capitals and accents, as the database's search does (atlas_fold()), so
 * "stefan" marks "Ștefan". Each letter is folded on its own, so a place in the folded text is the
 * same place in the snippet.
 * Who calls it: components/HighlightedSnippet.tsx. What it calls: nothing.
 */

/** One part of a snippet, and whether it matches. */
export interface SnippetPart {
  text: string;
  isMatch: boolean;
}

/** One letter in lower case with its accent off; a letter that folds to more stays as it is. */
function foldedLetter(letter: string): string {
  const folded = letter.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  return folded.length === letter.length ? folded : letter.toLocaleLowerCase();
}

/** A whole text folded letter by letter, the same length as the text. */
function foldedText(text: string): string {
  return Array.from(text, foldedLetter).join('');
}

/**
 * Cuts a snippet into matching and other parts.
 *
 * @param snippet - the text to show
 * @param query - what the writer typed
 * @returns the parts in order; the whole snippet as one part when nothing matches
 */
export function highlightMatches(snippet: string, query: string): SnippetPart[] {
  const wanted = foldedText(query.trim().replace(/\s+/g, ' '));
  if (wanted === '') return [{ text: snippet, isMatch: false }];
  const haystack = foldedText(snippet);
  const parts: SnippetPart[] = [];
  let readUpTo = 0;
  let found = haystack.indexOf(wanted);
  // Every match in turn, with the words between them.
  while (found !== -1) {
    if (found > readUpTo) parts.push({ text: snippet.slice(readUpTo, found), isMatch: false });
    parts.push({ text: snippet.slice(found, found + wanted.length), isMatch: true });
    readUpTo = found + wanted.length;
    found = haystack.indexOf(wanted, readUpTo);
  }
  if (readUpTo < snippet.length) parts.push({ text: snippet.slice(readUpTo), isMatch: false });
  return parts;
}
