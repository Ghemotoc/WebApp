/**
 * Splits a headline line around the word that gets the gold underline (story S1-E11-06: "which
 * headline word gets the gold underline").
 *
 * Who calls it: HomeHero and the editor's HeroPreview, so the preview and the page agree.
 */

/** A line in three parts; underlined is empty when the word isn't in the line. */
export interface SplitLine {
  before: string;
  underlined: string;
  after: string;
}

/**
 * Finds the first place the word appears in the line.
 *
 * @param line - one headline line, for example "Get read."
 * @param word - the chosen word, for example "read"
 * @returns the parts; the whole line is "before" when the word isn't there
 */
export function splitAroundWord(line: string, word: string): SplitLine {
  const trimmedWord = word.trim();
  const start = trimmedWord === '' ? -1 : line.indexOf(trimmedWord);
  if (start === -1) return { before: line, underlined: '', after: '' };
  return {
    before: line.slice(0, start),
    underlined: trimmedWord,
    after: line.slice(start + trimmedWord.length),
  };
}
