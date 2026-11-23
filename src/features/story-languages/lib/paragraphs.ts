/**
 * Paragraph by paragraph: how the side-by-side translation editor turns a chapter's text into
 * rows and back (bundle TRANSLATE-1c; board TrEditor; Robert, 16 Nov 2026).
 *
 * A chapter's text is Markdown with a blank line between paragraphs. The editor shows the
 * original's paragraphs on the left and one field per paragraph on the right. The handoff says:
 * "A paragraph you leave empty is shown to readers in the original until it's translated."
 * So the saved text of a translation always has every paragraph: the translated one where the
 * writer wrote one, the original where the field is empty. Reading it back, a paragraph that is
 * word for word the original counts as not translated yet, and its field shows empty again. No
 * extra column is needed for that.
 * Who calls it: hooks/useTranslationEditor.ts. What it calls: nothing.
 */

/**
 * Splits a chapter's text into its paragraphs.
 *
 * @param body - the Markdown text
 * @returns the paragraphs in order, trimmed, with no empty ones
 */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
}

/**
 * The fields the editor starts with: one per paragraph of the original.
 *
 * @param originalParagraphs - the original's paragraphs
 * @param draftBody - the translation's saved text ('' for a new translation)
 * @returns one text per original paragraph: the translation, or '' where it isn't translated yet
 */
export function translationFields(originalParagraphs: string[], draftBody: string): string[] {
  const draftParagraphs = splitParagraphs(draftBody);
  const lastIndex = originalParagraphs.length - 1;
  return originalParagraphs.map((original, index) => {
    // The last field also takes anything the draft has beyond the original's paragraphs (a
    // translation edited in the full editor can be longer), so nothing the writer wrote is lost.
    const draft =
      index === lastIndex
        ? draftParagraphs.slice(index).join('\n\n')
        : (draftParagraphs[index] ?? '');
    // Word for word the original means "not translated yet".
    return draft === original ? '' : draft;
  });
}

/**
 * The text to save: every paragraph, the original standing in for an empty field.
 *
 * @param originalParagraphs - the original's paragraphs
 * @param fields - the editor's fields, one per original paragraph
 * @returns the Markdown text of the translation
 */
export function composeTranslation(originalParagraphs: string[], fields: string[]): string {
  const lastIndex = originalParagraphs.length - 1;
  return originalParagraphs
    .map((original, index) => {
      const typed = (fields[index] ?? '').trim();
      // A blank line inside a field would become a paragraph of its own and push every later
      // paragraph one row down, so it is saved as a plain line break. The last field keeps its
      // blank lines: nothing comes after it, and it may hold extra paragraphs from the full editor.
      const translated = index === lastIndex ? typed : typed.replace(/\n\s*\n/g, '\n');
      return translated === '' ? original : translated;
    })
    .join('\n\n');
}

/**
 * How many paragraphs are translated, for "2 of 4 paragraphs".
 *
 * @param fields - the editor's fields
 * @returns the number of fields with words in them
 */
export function translatedCount(fields: string[]): number {
  return fields.filter((field) => field.trim() !== '').length;
}

/**
 * How many words a text has, for the heads "Original English · 64 words" and the progress line
 * "41 of 64 words so far" (CALM-9, board D09).
 *
 * @param text - any text; Markdown marks count as part of the word they touch
 * @returns the number of runs of letters between spaces
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}
