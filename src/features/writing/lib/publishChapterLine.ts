/**
 * The line under the Publish chapter dialog's heading: "Chapter 16 · Epilogue: Spring" (board
 * D06, user story 5.6).
 *
 * Who calls it: ChapterEditorPage, for the Sheet's subtitle. What it calls: i18next's t() with
 * the editor's words (editor.json, publish.chapterLine and publish.chapterLineUntitled). Kept
 * apart from the component so it can be tested on its own.
 */
/** The part of t() this needs: a key and its values, back as text. */
type Translate = (key: string, values: Record<string, unknown>) => string;

/**
 * Builds the line from the chapter's number and its title as typed.
 *
 * @param t - the editor's translate function
 * @param chapterNumber - the chapter's place in the story; null while it loads
 * @param title - the title as typed; spaces alone count as no title
 * @returns the line, or an empty string while the number loads
 */
export function publishChapterLine(
  t: Translate,
  chapterNumber: number | null,
  title: string,
): string {
  // Step 1: without the number the line would mislead, so it waits.
  if (chapterNumber === null) return '';
  // Step 2: an untitled chapter shows its number only.
  const trimmedTitle = title.trim();
  if (trimmedTitle === '') return t('publish.chapterLineUntitled', { number: chapterNumber });
  return t('publish.chapterLine', { number: chapterNumber, title: trimmedTitle });
}
