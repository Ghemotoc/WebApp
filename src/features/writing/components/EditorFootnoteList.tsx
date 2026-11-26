/**
 * EditorFootnoteList: the chapter's notes at the end of the paper, in the editor (BOOKS-D05b;
 * board D13-EditorFootnotes, approved "as drawn").
 *
 * Board values: 40 px under the text a hairline, then "Notes" as a small label in the heading
 * colour and the notes in order, each row the number in the link colour, the note in the story
 * font and an Edit button, 12 px apart; the open note's row is tinted. It shows only while the
 * chapter has a note. Edit opens that note's box (FootnoteNotePanel), as the number in the text
 * does, so a note is reachable from the list by keyboard without finding its number.
 * Who uses it: EditorPaper. What it calls: useFootnoteEditing's footnotes and open.
 */
import type { FootnoteEditing } from '../hooks/useFootnoteEditing';
import { useEditorTranslation } from '../registerEditorTranslations';

/**
 * Renders the list, or nothing while the chapter has no notes.
 *
 * @param footnotes - the editor's footnotes and the open one
 * @returns the Notes section
 */
export function EditorFootnoteList({ footnotes }: { footnotes: FootnoteEditing }) {
  const { t } = useEditorTranslation();
  if (footnotes.footnotes.length === 0) return null;
  const openPosition = footnotes.openNote?.position ?? null;
  return (
    <section aria-labelledby="editor-notes-heading" className="mt-12 border-t border-hairline pt-4">
      <h2 id="editor-notes-heading" className="eyebrow m-0 mb-3">
        {t('footnote.notesHeading')}
      </h2>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {footnotes.footnotes.map((footnote, index) => (
          <li
            key={footnote.position}
            className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-2 ${
              footnote.position === openPosition ? '-mx-3 rounded-field bg-tint px-3 py-1' : ''
            }`}
          >
            <span className="type-meta font-semibold text-link">{index + 1}</span>
            <span className="font-story type-body break-words text-ink">{footnote.note}</span>
            <button
              type="button"
              aria-label={t('footnote.editLabel', { number: index + 1 })}
              onClick={() => footnotes.open(footnote.position)}
              className="inline-flex min-h-6 items-center type-meta font-semibold text-ink underline"
            >
              {t('footnote.edit')}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
