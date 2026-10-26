/**
 * Splits a classic's pasted text into chapters at its headings (story S1-E11-16 AC 3).
 *
 * Who calls it: components/classics/ClassicTextForm.tsx, for the preview staff check before
 * saving. What it calls: nothing. The database checks every chapter again (rule 8).
 * How: a Markdown heading line ("# I", "## Chapter one", up to three #) starts a chapter and
 * becomes its title; the lines until the next heading are its text. Text before the first
 * heading (often the source's title page) is its own chapter with no title, so nothing is lost
 * silently: staff can see it in the preview and remove it. A text with no headings is one chapter.
 */
import type { ClassicChapterDraft } from '../api/classics';

/** A heading line: one to three # then a space and the title. */
const headingLine = /^#{1,3}\s+(.+?)\s*#*\s*$/;

/**
 * Splits the text.
 *
 * @param text - the pasted or uploaded text (plain text or Markdown)
 * @returns the chapters in order; empty when the text is blank
 */
export function splitClassicText(text: string): ClassicChapterDraft[] {
  const chapters: ClassicChapterDraft[] = [];
  let current: { title: string; lines: string[] } = { title: '', lines: [] };

  /** Adds the chapter being read, unless it is empty (no title and no text). */
  function finishChapter() {
    const body = current.lines.join('\n').trim();
    if (current.title !== '' || body !== '') chapters.push({ title: current.title, body });
  }

  // Step 1: read line by line; Windows line ends count as ordinary ones.
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = headingLine.exec(line);
    if (heading?.[1] === undefined) {
      current.lines.push(line);
      continue;
    }
    // Step 2: a heading ends the chapter before it and starts a new one.
    finishChapter();
    current = { title: heading[1], lines: [] };
  }
  finishChapter();
  return chapters;
}
