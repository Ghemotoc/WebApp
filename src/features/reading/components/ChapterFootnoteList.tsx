/**
 * ChapterFootnoteList: the chapter's notes, listed under the text (BOOKS-D05b; board
 * B15-ReaderFootnotes, approved "as drawn").
 *
 * Board values: under the text a hairline, then "Notes" as a small label in the heading colour and
 * the notes in order, each row the number in the link colour and the note in the story font, with
 * a Back link (the return arrow, named "Back to the text, note 1") that goes to the number in the
 * text and puts focus on it. A row the reader came to from its address is tinted (:target). It
 * shows only when the chapter has notes. This is the way to every note for anyone who doesn't open
 * the numbers one by one, and the place a tablet or phone reader can read them all at once.
 * The numbers come from footnotesIn() (src/lib/chapter-footnotes.ts), which counts the notes in
 * the same order as the text's numbers (lib/numberFootnotes.ts).
 * Who uses it: ChapterText. What it calls: footnotesIn and ActionIcon.
 */
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { footnotesIn } from '@/lib/chapter-footnotes';

import { footnoteReferenceId } from '../lib/numberFootnotes';

/** What the list needs. */
export interface ChapterFootnoteListProps {
  /** The chapter as stored. */
  markdown: string;
  /** The story's language, for the notes' words (WCAG 3.1.2). */
  language: string;
  /** The same id start as the text's numbers. */
  idPrefix: string;
}

/**
 * Goes back to a note's number: scrolls it into view and moves focus to it, which following the
 * address alone doesn't do for a button.
 *
 * @param event - the Back link's click
 * @param referenceId - the number's element id
 */
function goBackToNumber(event: MouseEvent<HTMLAnchorElement>, referenceId: string) {
  const marker = document.getElementById(referenceId);
  if (marker === null) return;
  event.preventDefault();
  marker.scrollIntoView({ block: 'center' });
  marker.focus({ preventScroll: true });
}

/**
 * Renders the list, or nothing while the chapter has no notes.
 *
 * @returns the Notes section
 */
export function ChapterFootnoteList({ markdown, language, idPrefix }: ChapterFootnoteListProps) {
  const { t } = useTranslation('reading');
  const notes = footnotesIn(markdown);
  if (notes.length === 0) return null;
  const headingId = `${idPrefix}-notes-heading`;
  return (
    <section aria-labelledby={headingId} className="mt-12 border-t border-hairline pt-4">
      <h2 id={headingId} className="eyebrow m-0 mb-3">
        {t('footnote.notesHeading')}
      </h2>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {notes.map((note, index) => {
          const number = index + 1;
          const referenceId = footnoteReferenceId(idPrefix, number);
          return (
            <li
              key={number}
              id={`${idPrefix}-footnote-${number}`}
              className="tmc-footnote-row grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-2"
            >
              <span className="type-meta font-semibold text-link">{number}</span>
              <span lang={language} className="font-story type-body break-words text-ink">
                {note}
              </span>
              <a
                href={`#${referenceId}`}
                aria-label={t('footnote.backLabel', { number })}
                onClick={(event) => goBackToNumber(event, referenceId)}
                className="inline-flex min-h-6 items-center gap-1 type-meta font-semibold text-ink underline"
              >
                <ActionIcon name="undo" size={14} />
                {t('footnote.back')}
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
